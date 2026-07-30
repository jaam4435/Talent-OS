import type { AiCompletionRequest, AiMessage } from '@/lib/ai/types'
import { AiGuardrailError } from '@/lib/ai/guardrails/errors'

const DEFAULT_MAX_INPUT_CHARS = Number(process.env.AI_MAX_INPUT_CHARS ?? 32_000)
const DEFAULT_MAX_OUTPUT_CHARS = Number(process.env.AI_MAX_OUTPUT_CHARS ?? 16_000)
const DEFAULT_MAX_MESSAGES = Number(process.env.AI_MAX_MESSAGES ?? 50)

/** Patterns blocked in user-facing content (basic PII / injection heuristics). */
const BLOCKED_PATTERNS: Array<{ pattern: RegExp; code: string; label: string }> = [
  { pattern: /\b(?:sk-[a-zA-Z0-9]{20,})\b/, code: 'API_KEY_LEAK', label: 'API key detected' },
  {
    pattern: /\b(?:ignore (?:all )?previous instructions|disregard (?:all )?(?:prior|above))/i,
    code: 'PROMPT_INJECTION',
    label: 'Prompt injection pattern',
  },
]

export interface GuardrailOptions {
  maxInputChars?: number
  maxOutputChars?: number
  maxMessages?: number
  allowEmptyOutput?: boolean
}

export interface GuardrailResult {
  messages: AiMessage[]
  sanitized: boolean
  warnings: string[]
}

function totalChars(messages: AiMessage[]): number {
  return messages.reduce((sum, m) => sum + m.content.length, 0)
}

function scanContent(content: string, field: 'input' | 'output'): void {
  for (const rule of BLOCKED_PATTERNS) {
    if (rule.pattern.test(content)) {
      throw new AiGuardrailError(`Guardrail blocked: ${rule.label}`, rule.code, field)
    }
  }
}

/** Validates and sanitizes inbound gateway requests. */
export function validateInput(
  request: AiCompletionRequest,
  options: GuardrailOptions = {}
): GuardrailResult {
  const maxInputChars = options.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES
  const warnings: string[] = []

  if (!request.messages?.length) {
    throw new AiGuardrailError('At least one message is required', 'EMPTY_MESSAGES', 'input')
  }

  if (request.messages.length > maxMessages) {
    throw new AiGuardrailError(
      `Message count ${request.messages.length} exceeds limit ${maxMessages}`,
      'TOO_MANY_MESSAGES',
      'input'
    )
  }

  for (const message of request.messages) {
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      throw new AiGuardrailError(`Invalid message role: ${message.role}`, 'INVALID_ROLE', 'input')
    }
    scanContent(message.content, 'input')
  }

  let messages = request.messages
  if (totalChars(messages) > maxInputChars) {
    warnings.push(`Input truncated from ${totalChars(messages)} to ${maxInputChars} chars`)
    messages = truncateMessages(messages, maxInputChars)
  }

  return { messages, sanitized: warnings.length > 0, warnings }
}

/** Validates provider output before returning to callers. */
export function validateOutput(content: string, options: GuardrailOptions = {}): string {
  const maxOutputChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS

  if (!content && !options.allowEmptyOutput) {
    throw new AiGuardrailError('Empty AI response', 'EMPTY_OUTPUT', 'output')
  }

  scanContent(content, 'output')

  if (content.length > maxOutputChars) {
    return content.slice(0, maxOutputChars)
  }

  return content
}

function truncateMessages(messages: AiMessage[], maxChars: number): AiMessage[] {
  const system = messages.filter((m) => m.role === 'system')
  const rest = messages.filter((m) => m.role !== 'system')
  let budget = maxChars - totalChars(system)

  const kept: AiMessage[] = [...system]
  for (let i = rest.length - 1; i >= 0; i--) {
    const msg = rest[i]!
    if (msg.content.length <= budget) {
      kept.splice(system.length, 0, msg)
      budget -= msg.content.length
    } else if (budget > 100) {
      kept.splice(system.length, 0, {
        ...msg,
        content: msg.content.slice(-budget),
      })
      break
    }
  }

  return kept.length ? kept : [messages[messages.length - 1]!]
}
