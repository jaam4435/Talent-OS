/** Canonical crm domain event type strings. */
export const CrmEvents = {
  OPPORTUNITY_OPENED: 'opportunity.opened',
  OPPORTUNITY_BROADCAST: 'opportunity.broadcast',
  OPPORTUNITY_RESPONSE: 'opportunity.response',
} as const

export type CrmEventType = (typeof CrmEvents)[keyof typeof CrmEvents]
