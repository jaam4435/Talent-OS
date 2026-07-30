import { NextResponse } from 'next/server'
import { validateSystemAuth } from '@/lib/integrations/system-auth'
import { executeTalentMatch } from '@/lib/integrations/ai/matching'

export async function POST(request: Request) {
  const auth = validateSystemAuth(request.headers.get('authorization'), 'internal')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { ai_request_id?: string; actor_id?: string | null }
  try {
    body = (await request.json()) as { ai_request_id?: string; actor_id?: string | null }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!body.ai_request_id) {
    return NextResponse.json({ error: 'ai_request_id is required' }, { status: 400 })
  }

  try {
    const result = await executeTalentMatch(body.ai_request_id, body.actor_id ?? null)
    if (result.skipped) {
      return NextResponse.json({ data: result }, { status: 409 })
    }
    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'EXECUTION_FAILED'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
