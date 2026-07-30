import { NextResponse } from 'next/server'
import { requireTenant } from '@/modules/core/services/session'
import { createStreamResponse } from '@/lib/ai/streaming/handler'
import { globalPromptManager } from '@/lib/ai/prompt/manager'
import type { AiFeature } from '@/lib/ai/types'

export async function POST(request: Request) {
  const { tenant, user } = await requireTenant()

  let body: {
    promptId?: string
    userContent?: unknown
    promptVersion?: string
    feature?: AiFeature
    query?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const promptId = body.promptId ?? 'whatsapp.agent'
  const userContent = body.userContent ?? body.query

  if (!userContent) {
    return NextResponse.json({ error: 'userContent or query is required' }, { status: 400 })
  }

  const built = globalPromptManager.build(promptId, userContent, body.promptVersion)

  const stream = createStreamResponse({
    tenantId: tenant.id,
    feature: body.feature ?? 'digest',
    promptId: built.promptId,
    promptVersion: built.promptVersion,
    messages: [
      { role: 'system', content: built.system },
      { role: 'user', content: built.user },
    ],
    metadata: { userId: user.id },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
