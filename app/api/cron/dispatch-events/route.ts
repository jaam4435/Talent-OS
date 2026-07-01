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

  for (const event of events ?? []) {
    await markEventProcessing(event.id)

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
