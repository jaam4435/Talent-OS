/** Canonical ai domain event type strings. */
export const AiEvents = {
  MATCH_REQUESTED: 'ai.match_requested',
  BRIEF_PARSE_REQUESTED: 'ai.brief_parse_requested',
} as const

export type AiEventType = (typeof AiEvents)[keyof typeof AiEvents]
