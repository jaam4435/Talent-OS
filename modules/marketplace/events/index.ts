export const MarketplaceEvents = {
  PROFILE_PUBLISHED: 'marketplace.profile_published',
  INVITATION_SENT: 'marketplace.invitation_sent',
  APPLICATION_RECEIVED: 'marketplace.application_received',
  CONTRACT_SIGNED: 'marketplace.contract_signed',
  RECOMMENDATION_GENERATED: 'marketplace.recommendation_generated',
  MATCH_COMPLETED: 'marketplace.match_completed',
} as const

export type MarketplaceEventType = (typeof MarketplaceEvents)[keyof typeof MarketplaceEvents]
