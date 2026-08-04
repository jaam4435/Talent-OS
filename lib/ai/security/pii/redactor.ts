import type { AiMessage } from '@/lib/ai/types'

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?){2}\d{4}\b/g
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g

export function isPiiRedactionEnabled(): boolean {
  if (process.env.AI_PII_REDACTION_ENABLED === 'false') return false
  return process.env.AI_PII_REDACTION_ENABLED === 'true' || process.env.NODE_ENV === 'production'
}

export function redactPii(text: string): { text: string; redactionCount: number } {
  let redactionCount = 0
  let output = text

  const apply = (pattern: RegExp, replacement: string) => {
    output = output.replace(pattern, () => {
      redactionCount += 1
      return replacement
    })
  }

  apply(EMAIL_PATTERN, '[REDACTED_EMAIL]')
  apply(PHONE_PATTERN, '[REDACTED_PHONE]')
  apply(SSN_PATTERN, '[REDACTED_SSN]')

  return { text: output, redactionCount }
}

export function redactMessages(messages: AiMessage[]): { messages: AiMessage[]; redactionCount: number } {
  if (!isPiiRedactionEnabled()) {
    return { messages, redactionCount: 0 }
  }

  let redactionCount = 0
  const redacted = messages.map((message) => {
    const result = redactPii(message.content)
    redactionCount += result.redactionCount
    return { ...message, content: result.text }
  })

  return { messages: redacted, redactionCount }
}
