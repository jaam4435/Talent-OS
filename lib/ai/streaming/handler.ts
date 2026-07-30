import { getAiGateway } from '@/lib/ai/gateway'
import type { AiCompletionRequest, AiStreamChunk } from '@/lib/ai/types'

export async function collectStream(request: AiCompletionRequest): Promise<{
  content: string
  chunks: AiStreamChunk[]
}> {
  const gateway = getAiGateway()
  const chunks: AiStreamChunk[] = []
  let content = ''

  for await (const chunk of gateway.stream(request)) {
    chunks.push(chunk)
    if (!chunk.done) {
      content += chunk.content
    }
  }

  return { content, chunks }
}

export function createStreamResponse(
  request: AiCompletionRequest,
  onChunk?: (chunk: AiStreamChunk) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const gateway = getAiGateway()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of gateway.stream(request)) {
          onChunk?.(chunk)
          const payload = JSON.stringify(chunk)
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
          if (chunk.done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          }
        }
        controller.close()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Stream failed'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
        controller.close()
      }
    },
  })
}
