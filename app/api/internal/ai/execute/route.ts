import { NextResponse } from 'next/server'
import { executeAiRequest } from '@/lib/integrations/ai/executor'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    ai_request_id?: string
    actor_id?: string | null
  }

  if (!body.ai_request_id) {
    return NextResponse.json({ error: 'ai_request_id is required' }, { status: 400 })
  }

  try {
    const result = await executeAiRequest(body.ai_request_id, body.actor_id ?? null)
    return NextResponse.json({ data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'EXECUTION_FAILED'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
