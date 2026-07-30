/** Canonical workflow domain event type strings. */
export const WorkflowEvents = {
  DOMAIN_EVENT_EMITTED: 'domain_event.emitted',
} as const

export type WorkflowEventType = (typeof WorkflowEvents)[keyof typeof WorkflowEvents]
