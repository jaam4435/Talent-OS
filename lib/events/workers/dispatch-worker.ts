import { findWorkflowsForEvent } from '@/lib/workflows/registry'
import { buildN8nEnvelope, dispatchToN8n } from '@/lib/integrations/n8n'
import type { Services } from '@/lib/services/factory'
import type { DomainEventRow } from '@/lib/repositories/domain-event.repository'

const DIRECT_AI_EVENTS = new Set([
  'ai.match_requested',
  'ai.brief_parse_requested',
  'ai.summary_requested',
  'ai.status_assessment_requested',
])

export interface DispatchWorkerResult {
  processed: number
  triggered: number
  legacyDelivered: number
  failed: number
  results: Array<{ id: string; ok: boolean; workflows?: number; error?: string }>
}

/** Background worker: claim outbox events and trigger workflows or legacy dispatch. */
export async function runEventDispatchWorker(
  services: Services,
  limit = 50
): Promise<DispatchWorkerResult> {
  const events = (await services.workflow.claimForDispatch(limit)) as DomainEventRow[]
  const results: DispatchWorkerResult['results'] = []

  for (const event of events) {
    try {
      await services.eventPlatform.recordProcessingFingerprint(event.id)
    } catch {
      // Fingerprint table may be unavailable before migration
    }

    const workflows = findWorkflowsForEvent(event.event_type)

    if (workflows.length > 0) {
      try {
        const started = await services.workflowEngine.triggerFromDomainEvent({
          id: event.id,
          tenant_id: event.tenant_id,
          event_type: event.event_type,
          aggregate_type: event.aggregate_type,
          aggregate_id: event.aggregate_id,
          payload: (event.payload as Record<string, unknown>) ?? null,
          actor_id: event.actor_id,
          correlation_id: event.correlation_id,
          idempotency_key: event.idempotency_key,
        })
        // Leave status=processing — finalized when all workflow jobs complete
        results.push({ id: event.id, ok: true, workflows: started.length })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Workflow trigger failed'
        await services.workflow.markEventFailed(event.id, message)
        results.push({ id: event.id, ok: false, error: message })
      }
      continue
    }

    const legacy = await legacyDispatch(services, {
      event_type: event.event_type,
      payload: (event.payload as Record<string, unknown> | null) ?? null,
      actor_id: event.actor_id,
      tenant_id: event.tenant_id,
      correlation_id: event.correlation_id,
      idempotency_key: event.idempotency_key,
    })
    if (legacy.ok) {
      await services.workflow.markEventDelivered(event.id)
      results.push({ id: event.id, ok: true, workflows: 0 })
    } else {
      await services.workflow.markEventFailed(event.id, legacy.error ?? 'Dispatch failed')
      results.push({ id: event.id, ok: false, error: legacy.error })
    }
  }

  return {
    processed: results.length,
    triggered: results.filter((r) => r.ok && (r.workflows ?? 0) > 0).length,
    legacyDelivered: results.filter((r) => r.ok && (r.workflows ?? 0) === 0).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  }
}

async function legacyDispatch(
  services: Services,
  event: {
    event_type: string
    payload: Record<string, unknown> | null
    actor_id: string | null
    tenant_id: string
    correlation_id: string
    idempotency_key: string
  }
): Promise<{ ok: boolean; error?: string }> {
  const directAiMode = process.env.AI_EXECUTION_MODE === 'direct'

  if (directAiMode && DIRECT_AI_EVENTS.has(event.event_type)) {
    const aiRequestId = event.payload?.ai_request_id
    if (typeof aiRequestId !== 'string') {
      return { ok: false, error: 'Missing ai_request_id in payload' }
    }
    try {
      await services.ai.executeRequest(aiRequestId, event.actor_id)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'AI execution failed' }
    }
  }

  const envelope = buildN8nEnvelope({
    event: event.event_type,
    tenantId: event.tenant_id,
    data: event.payload ?? {},
    idempotencyKey: event.idempotency_key,
    correlationId: event.correlation_id,
    actorId: event.actor_id,
  })

  const result = await dispatchToN8n(envelope)
  if (!result.ok) return { ok: false, error: result.error ?? `HTTP ${result.status}` }
  return { ok: true }
}

/** Finalize domain events whose workflow runs have fully completed. */
export async function runEventCompletionWorker(services: Services, limit = 100): Promise<number> {
  const processing = await services.workflow.listProcessingEvents(limit)
  let finalized = 0

  for (const event of processing) {
    const done = await services.eventPlatform.finalizeEventIfComplete(event.id)
    if (done) finalized += 1
  }

  return finalized
}
