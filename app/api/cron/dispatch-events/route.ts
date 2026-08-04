import { withApiHandler } from '@/modules/core/api/handler'
import { instrumentQueueProcessing } from '@/lib/observability/instrumentation'
import { findWorkflowsForEvent } from '@/lib/workflows/registry'
import {
  buildN8nEnvelope,
  dispatchToN8n,
  type N8nEventEnvelope,
} from '@/lib/integrations/n8n'
import {
  markEventDelivered,
  markEventFailed,
  markEventProcessing,
} from '@/lib/integrations/events'
import { createAdminServices } from '@/lib/services/factory'

const DIRECT_AI_EVENTS = new Set([
  'ai.match_requested',
  'ai.brief_parse_requested',
  'ai.summary_requested',
  'ai.status_assessment_requested',
])

async function legacyDispatch(event: {
  id: string
  tenant_id: string
  event_type: string
  payload: Record<string, unknown> | null
  actor_id: string | null
  correlation_id: string
  idempotency_key: string
}): Promise<{ ok: boolean; error?: string }> {
  const directAiMode = process.env.AI_EXECUTION_MODE !== 'n8n'

  if (directAiMode && DIRECT_AI_EVENTS.has(event.event_type)) {
    const aiRequestId = event.payload?.ai_request_id
    if (typeof aiRequestId !== 'string') {
      return { ok: false, error: 'Missing ai_request_id in payload' }
    }
    try {
      const services = await createAdminServices()
      await services.ai.executeRequest(aiRequestId, event.actor_id)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'AI execution failed',
      }
    }
  }

  const envelope: N8nEventEnvelope = buildN8nEnvelope({
    event: event.event_type,
    tenantId: event.tenant_id,
    data: event.payload ?? {},
    idempotencyKey: event.idempotency_key,
    correlationId: event.correlation_id,
    actorId: event.actor_id,
  })

  const result = await dispatchToN8n(envelope)
  if (!result.ok) {
    return { ok: false, error: result.error ?? `HTTP ${result.status}` }
  }
  return { ok: true }
}

async function processEvent(
  event: {
    id: string
    tenant_id: string
    event_type: string
    aggregate_type: string
    aggregate_id: string
    payload: Record<string, unknown> | null
    actor_id: string | null
    correlation_id: string
    idempotency_key: string
  },
  services: Awaited<ReturnType<typeof createAdminServices>>
): Promise<{ id: string; ok: boolean; workflows?: number; error?: string }> {
  await markEventProcessing(event.id)

  const workflows = findWorkflowsForEvent(event.event_type)

  if (workflows.length > 0) {
    try {
      const started = await services.workflowEngine.triggerFromDomainEvent({
        id: event.id,
        tenant_id: event.tenant_id,
        event_type: event.event_type,
        aggregate_type: event.aggregate_type,
        aggregate_id: event.aggregate_id,
        payload: event.payload,
        actor_id: event.actor_id,
        correlation_id: event.correlation_id,
        idempotency_key: event.idempotency_key,
      })
      await markEventDelivered(event.id)
      return { id: event.id, ok: true, workflows: started.length }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workflow trigger failed'
      await markEventFailed(event.id, message)
      return { id: event.id, ok: false, error: message }
    }
  }

  const result = await legacyDispatch(event)

  if (result.ok) {
    await markEventDelivered(event.id)
    return { id: event.id, ok: true, workflows: 0 }
  }

  await markEventFailed(event.id, result.error ?? 'Dispatch failed')
  return { id: event.id, ok: false, error: result.error }
}

const DISPATCH_CONCURRENCY = 5

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export const GET = withApiHandler(
  { auth: 'cron', rateLimit: 'cron', legacyEnvelope: true },
  async () => {
    const startedAt = Date.now()
    const services = await createAdminServices()
    const events = await services.workflow.listPendingForDispatch(50)

    const results = await mapWithConcurrency(events, DISPATCH_CONCURRENCY, (event) =>
      processEvent(
        {
          id: event.id,
          tenant_id: event.tenant_id,
          event_type: event.event_type,
          aggregate_type: event.aggregate_type,
          aggregate_id: event.aggregate_id,
          payload: (event.payload as Record<string, unknown>) ?? null,
          actor_id: event.actor_id,
          correlation_id: event.correlation_id,
          idempotency_key: event.idempotency_key,
        },
        services
      )
    )

    const result = {
      processed: results.length,
      delivered: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    }

    instrumentQueueProcessing({
      queue: 'domain_events',
      processed: result.processed,
      failed: result.failed,
      durationMs: Date.now() - startedAt,
    })

    return result
  }
)
