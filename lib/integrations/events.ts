import { createAdminClient } from '@/modules/core/utils/supabase/admin'

export interface EmitEventInput {
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

export async function emitEvent(input: EmitEventInput): Promise<string | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('emit_domain_event', {
    p_tenant_id: input.tenantId,
    p_event_type: input.eventType,
    p_aggregate_type: input.aggregateType,
    p_aggregate_id: input.aggregateId,
    p_idempotency_key: input.idempotencyKey,
    p_payload: input.payload ?? {},
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

export async function markEventProcessing(eventId: string) {
  const supabase = createAdminClient()
  await supabase
    .from('domain_events')
    .update({ status: 'processing' })
    .eq('id', eventId)
    .eq('status', 'pending')
}

export async function markEventDelivered(eventId: string) {
  const supabase = createAdminClient()
  await supabase
    .from('domain_events')
    .update({ status: 'delivered', processed_at: new Date().toISOString() })
    .eq('id', eventId)
}

export async function markEventFailed(eventId: string, error: string) {
  const supabase = createAdminClient()
  const { data: event } = await supabase
    .from('domain_events')
    .select('retry_count, max_retries')
    .eq('id', eventId)
    .maybeSingle()

  const retryCount = (event?.retry_count ?? 0) + 1
  const maxRetries = event?.max_retries ?? 5
  const status = retryCount >= maxRetries ? 'dead_letter' : 'failed'

  await supabase
    .from('domain_events')
    .update({
      status,
      retry_count: retryCount,
      last_error: error,
      scheduled_at:
        status === 'failed'
          ? new Date(Date.now() + Math.pow(2, retryCount) * 30_000).toISOString()
          : undefined,
    })
    .eq('id', eventId)
}
