/** Canonical talent domain event type strings. */
export const TalentEvents = {
  FREELANCER_CREATED: 'talent.freelancer_created',
  FREELANCER_UPDATED: 'talent.freelancer_updated',
} as const

export type TalentEventType = (typeof TalentEvents)[keyof typeof TalentEvents]
