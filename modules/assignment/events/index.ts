/** Canonical assignment domain event type strings. */
export const AssignmentEvents = {
  SHORTLIST_UPDATED: 'shortlist.updated',
  MATCH_SCORED: 'assignment.match_scored',
} as const

export type AssignmentEventType = (typeof AssignmentEvents)[keyof typeof AssignmentEvents]
