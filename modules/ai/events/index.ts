/** Canonical ai application event type strings. */
export const AiEvents = {
  MATCH_REQUESTED: 'ai.match_requested',
  BRIEF_PARSE_REQUESTED: 'ai.brief_parse_requested',
  SUMMARY_REQUESTED: 'ai.summary_requested',
  STATUS_ASSESSMENT_REQUESTED: 'ai.status_assessment_requested',
} as const

export type AiEventType = (typeof AiEvents)[keyof typeof AiEvents]
