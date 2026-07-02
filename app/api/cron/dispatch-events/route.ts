import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
import { executeAiRequest } from '@/lib/integrations/ai/executor'

const DIRECT_AI_EVENTS = new Set([
  'ai.match_requested',
  'ai.brief_parse_requested',
  'ai.summary_requested',
  'ai.status_assessment_requested',
])

async function processDirectAiEvent(event: {
  event_type: string
  payload: Record<string, unknown> | null
  actor_id: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const aiRequestId = event.payload?.ai_request_id
  if (typeof aiRequestId !== 'string') {
    return { ok: false, error: 'Missing ai_request_id in payload' }
  }

  if (!DIRECT_AI_EVENTS.has(event.event_type)) {
    return { ok: false, error: 'Unsupported AI event' }
  }

  try {
    await executeAiRequest(aiRequestId, event.actor_id)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'AI execution failed',
    }
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: events, error } = await supabase
    .from('domain_events')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lte('scheduled_at', new Date().toISOString())
    .order('created_at')
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = []

  const directAiMode = process.env.AI_EXECUTION_MODE === 'direct'

  for (const event of events ?? []) {
    await markEventProcessing(event.id)

    if (directAiMode && DIRECT_AI_EVENTS.has(event.event_type)) {
      const result = await processDirectAiEvent({
        event_type: event.event_type,
        payload: (event.payload as Record<string, unknown>) ?? null,
        actor_id: event.actor_id,
      })

      if (result.ok) {
        await markEventDelivered(event.id)
        results.push({ id: event.id, ok: true })
      } else {
        await markEventFailed(event.id, result.error ?? 'Direct AI execution failed')
        results.push({ id: event.id, ok: false, error: result.error })
      }
      continue
    }

    const envelope: N8nEventEnvelope = buildN8nEnvelope({
      event: event.event_type,
      tenantId: event.tenant_id,
      data: (event.payload as Record<string, unknown>) ?? {},
      idempotencyKey: event.idempotency_key,
      correlationId: event.correlation_id,
      actorId: event.actor_id,
    })

    const result = await dispatchToN8n(envelope)

    if (result.ok) {
      await markEventDelivered(event.id)
      results.push({ id: event.id, ok: true })
    } else {
      await markEventFailed(event.id, result.error ?? `HTTP ${result.status}`)
      results.push({ id: event.id, ok: false, error: result.error })
    }
  }

  return NextResponse.json({
    processed: results.length,
    delivered: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}
