import { AiGuardrailError } from '@/lib/ai/errors'
import type { AiMessage } from '@/lib/ai/types'

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all )?(previous|prior) instructions/i,
  /disregard (the )?(system|above) prompt/i,
  /you are now (?:a|an) /i,
  /<\s*script[\s>]/i,
  /(?:^|\s)(?:system|assistant)\s*:\s*/i,
]

export function isGuardrailsEnabled(): boolean {
  if (process.env.AI_GUARDRAILS_ENABLED === 'false') return false
  return process.env.AI_GUARDRAILS_ENABLED === 'true' || process.env.NODE_ENV === 'production'
}

export function assertInputGuardrails(messages: AiMessage[]): void {
  if (!isGuardrailsEnabled()) return

  for (const message of messages) {
    if (message.role !== 'user') continue
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(message.content)) {
        throw new AiGuardrailError('Prompt blocked by input guardrails')
      }
    }
  }
}
