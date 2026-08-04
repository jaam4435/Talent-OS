import { BaseAiProvider } from '@/lib/ai/providers/interface'
import type { ProviderCompletionParams, ProviderCompletionResult } from '@/lib/ai/types'

const DEFAULT_STRUCTURED = {
  matches: [],
  type: 'final',
  content: 'Mock AI response',
}

function buildMockContent(params: ProviderCompletionParams): string {
  if (params.schema) {
    const userMessage = [...params.messages].reverse().find((m) => m.role === 'user')?.content ?? ''
    if (params.schema.name === 'agent_reasoning_step') {
      return JSON.stringify({ type: 'final', content: `Mock agent reply for: ${userMessage.slice(0, 80)}` })
    }
    if (params.schema.name?.includes('match') || userMessage.includes('freelancer')) {
      return JSON.stringify({
        matches: [
          {
            freelancer_id: '00000000-0000-4000-8000-000000000001',
            score: 88,
            rationale: 'Mock deterministic match',
            skill_overlap: ['typescript'],
          },
        ],
      })
    }
    return JSON.stringify(DEFAULT_STRUCTURED)
  }

  const userMessage = [...params.messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  return `Mock completion: ${userMessage.slice(0, 120)}`
}

export class MockProvider extends BaseAiProvider {
  readonly id = 'mock' as const

  isConfigured(): boolean {
    return process.env.AI_MOCK_PROVIDER === 'true' || process.env.VITEST === 'true'
  }

  getDefaultModel(): string {
    return 'mock-model'
  }

  supportsStructuredOutput(): boolean {
    return true
  }

  async complete(params: ProviderCompletionParams): Promise<ProviderCompletionResult> {
    const content = buildMockContent(params)
    const inputTokens = Math.ceil(
      params.messages.reduce((sum, message) => sum + message.content.length, 0) / 4
    )
    const outputTokens = Math.ceil(content.length / 4)

    return {
      content,
      model: params.model || this.getDefaultModel(),
      inputTokens,
      outputTokens,
      raw: { mock: true },
    }
  }
}
