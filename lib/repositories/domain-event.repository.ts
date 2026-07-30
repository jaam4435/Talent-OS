import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'

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
