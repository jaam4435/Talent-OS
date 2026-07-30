import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json, Tables } from '@/modules/core/types/database'

export type DomainEventRow = Tables<'domain_events'>

export interface EmitDomainEventInput {
  tenantId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  idempotencyKey: string
  payload?: Record<string, unknown>
  actorId?: string | null
  correlationId?: string
  scheduledAt?: string
}

export class DomainEventRepository extends BaseRepository {
  async emit(input: EmitDomainEventInput): Promise<string | null> {
    const { data, error } = await this.ctx.supabase.rpc('emit_domain_event', {
      p_tenant_id: input.tenantId,
      p_event_type: input.eventType,
      p_aggregate_type: input.aggregateType,
      p_aggregate_id: input.aggregateId,
      p_idempotency_key: input.idempotencyKey,
      p_payload: (input.payload ?? {}) as Json,
      p_actor_id: input.actorId ?? null,
      p_correlation_id: input.correlationId ?? null,
      p_scheduled_at: input.scheduledAt ?? new Date().toISOString(),
    })

    if (error) {
      console.error('emitEvent failed:', error)
      return null
    }

    return data as string | null
  }

  async markProcessing(eventId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('domain_events')
      .update({ status: 'processing' })
      .eq('id', eventId)
      .eq('status', 'pending')
    this.throwIfError(error)
  }

  async markDelivered(eventId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('domain_events')
      .update({ status: 'delivered', processed_at: new Date().toISOString() })
      .eq('id', eventId)
    this.throwIfError(error)
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<{ id: string } | null> {
    const { data } = await this.ctx.supabase
      .from('domain_events')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    return data ?? null
  }

  async listPendingForDispatch(limit = 50) {
    const { data, error } = await this.ctx.supabase
      .from('domain_events')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('scheduled_at', new Date().toISOString())
      .order('created_at')
      .limit(limit)

    this.throwIfError(error)
    return data ?? []
  }

  /** Atomically claim events for dispatch via SKIP LOCKED RPC (fallback to row loop). */
  async claimForDispatch(limit = 50): Promise<DomainEventRow[]> {
    const { data, error } = await (this.ctx.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: DomainEventRow[] | null; error: { message?: string; code?: string } | null }>)(
      'claim_domain_events',
      { p_limit: limit }
    )
    if (!error && data !== null && data !== undefined) {
      return data
    }

    const candidates = await this.listPendingForDispatch(limit)
    const claimed: DomainEventRow[] = []

    for (const event of candidates) {
      const { data: row, error: updateError } = await this.ctx.supabase
        .from('domain_events')
        .update({ status: 'processing' })
        .eq('id', event.id)
        .eq('status', event.status)
        .select('*')
        .maybeSingle()

      this.throwIfError(updateError)
      if (row) claimed.push(row as DomainEventRow)
    }

    return claimed
  }

  async recordFingerprint(eventId: string, processor = 'dispatch-worker'): Promise<boolean> {
    // Table added in migration 021 — cast until database types regenerate
    const client = this.ctx.supabase as unknown as {
      from: (table: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string } | null }> }
    }
    const { error } = await client.from('event_processing_fingerprints').insert({
      event_id: eventId,
      processor,
    })
    if (error?.code === '23505') return false
    if (error) throw new Error(error.code ?? 'Fingerprint insert failed')
    return true
  }

  async finalizeIfComplete(eventId: string): Promise<boolean> {
    const { data, error } = await (this.ctx.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: boolean | null; error: { message?: string } | null }>)(
      'finalize_domain_event_if_complete',
      { p_event_id: eventId }
    )
    if (!error) return Boolean(data)

    // Fallback when RPC unavailable: mark delivered if no active workflow jobs
    const { count } = await this.ctx.supabase
      .from('workflow_runs')
      .select('id, workflow_jobs!inner(id)', { count: 'exact', head: true })
      .eq('trigger_event_id', eventId)

    if ((count ?? 0) === 0) {
      await this.markDelivered(eventId)
      return true
    }
    return false
  }

  async listProcessing(limit = 100) {
    const { data, error } = await this.ctx.supabase
      .from('domain_events')
      .select('id, tenant_id, event_type, created_at')
      .eq('status', 'processing')
      .order('created_at')
      .limit(limit)
    this.throwIfError(error)
    return data ?? []
  }

  async listDeadLetter(tenantId: string, limit = 50) {
    const { data, error } = await this.ctx.supabase
      .from('domain_events')
      .select('id, event_type, last_error, retry_count, created_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'dead_letter')
      .order('created_at', { ascending: false })
      .limit(limit)
    this.throwIfError(error)
    return data ?? []
  }

  async findById(eventId: string, tenantId: string) {
    const { data, error } = await this.ctx.supabase
      .from('domain_events')
      .select('*')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    this.throwIfError(error)
    return data
  }

  async listByTenant(
    tenantId: string,
    filters?: { status?: string; aggregateType?: string; aggregateId?: string; limit?: number }
  ) {
    let query = this.ctx.supabase
      .from('domain_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(filters?.limit ?? 50)

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.aggregateType) query = query.eq('aggregate_type', filters.aggregateType)
    if (filters?.aggregateId) query = query.eq('aggregate_id', filters.aggregateId)

    const { data, error } = await query
    this.throwIfError(error)
    return data ?? []
  }

  async markFailed(eventId: string, errorMessage: string): Promise<void> {
    const { data: event } = await this.ctx.supabase
      .from('domain_events')
      .select('retry_count, max_retries')
      .eq('id', eventId)
      .maybeSingle()

    const retryCount = (event?.retry_count ?? 0) + 1
    const maxRetries = event?.max_retries ?? 5
    const status = retryCount >= maxRetries ? 'dead_letter' : 'failed'

    const { error } = await this.ctx.supabase
      .from('domain_events')
      .update({
        status,
        retry_count: retryCount,
        last_error: errorMessage,
        scheduled_at:
          status === 'failed'
            ? new Date(Date.now() + Math.pow(2, retryCount) * 30_000).toISOString()
            : undefined,
      })
      .eq('id', eventId)

    this.throwIfError(error)
  }
}
