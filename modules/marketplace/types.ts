/** Marketplace domain types — architecture contracts. */

export const MARKETPLACE_VISIBILITY = ['private', 'tenant', 'marketplace'] as const
export type MarketplaceVisibility = (typeof MARKETPLACE_VISIBILITY)[number]

export const AVAILABILITY_BLOCK_TYPES = ['available', 'busy', 'booked', 'time_off'] as const
export type AvailabilityBlockType = (typeof AVAILABILITY_BLOCK_TYPES)[number]

export const RATING_SOURCES = ['internal', 'client', 'peer', 'project_completion'] as const
export type RatingSource = (typeof RATING_SOURCES)[number]

export const CONTRACT_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'signed',
  'active',
  'completed',
  'terminated',
  'canceled',
] as const
export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export const CONTRACT_PARTY_TYPES = ['agency', 'client', 'freelancer', 'witness'] as const
export type ContractPartyType = (typeof CONTRACT_PARTY_TYPES)[number]

export const INVITATION_TYPES = ['broadcast', 'direct', 'application', 'marketplace'] as const
export type InvitationType = (typeof INVITATION_TYPES)[number]

export const INVITATION_STATUSES = [
  'pending',
  'viewed',
  'accepted',
  'declined',
  'expired',
  'withdrawn',
] as const
export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

export const MATCH_SOURCES = ['ai', 'rule_based', 'marketplace', 'manual'] as const
export type MatchSource = (typeof MATCH_SOURCES)[number]

export const RECOMMENDATION_TYPES = [
  'talent_for_opportunity',
  'opportunity_for_talent',
  'similar_talent',
  're_engagement',
] as const
export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number]

export const MARKETPLACE_SUBDOMAINS = [
  'profiles',
  'availability',
  'ratings',
  'portfolio',
  'contracts',
  'invitations',
  'matching',
  'recommendations',
] as const
export type MarketplaceSubdomain = (typeof MARKETPLACE_SUBDOMAINS)[number]

// ─── Profile ───────────────────────────────────────────────────────────────

export interface MarketplaceProfileExtensions {
  marketplaceVisibility: MarketplaceVisibility
  publicSlug: string | null
  marketplaceHeadline: string | null
  marketplaceBio: string | null
  marketplacePublishedAt: string | null
}

/** Redacted public view — never includes internal_notes, email, phone unless opted in. */
export interface PublicTalentProfile {
  id: string
  publicSlug: string
  fullName: string
  discipline: string
  skills: string[]
  marketplaceHeadline: string | null
  marketplaceBio: string | null
  dayRate: number | null
  currency: string
  availability: string
  publicRating: number | null
  portfolioPreview: PublicPortfolioItem[]
}

export interface PublicPortfolioItem {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  projectUrl: string | null
  featured: boolean
}

// ─── Availability ──────────────────────────────────────────────────────────

export interface AvailabilityBlock {
  id: string
  tenantId: string
  freelancerId: string
  blockType: AvailabilityBlockType
  startsAt: string
  endsAt: string
  capacityPct: number
  timezone: string
  notes: string | null
  createdAt: string
}

export interface CreateAvailabilityBlockInput {
  freelancerId: string
  blockType: AvailabilityBlockType
  startsAt: string
  endsAt: string
  capacityPct?: number
  timezone?: string
  notes?: string
}

export interface AvailabilityCheckParams {
  freelancerId: string
  startsAt: string
  endsAt: string
}

export interface AvailabilityCheckResult {
  available: boolean
  conflictingBlocks: AvailabilityBlock[]
  summaryStatus: string
}

// ─── Ratings ───────────────────────────────────────────────────────────────

export interface MarketplaceRating {
  id: string
  tenantId: string
  freelancerId: string
  source: RatingSource
  rating: number
  reviewerType: string
  reviewerId: string | null
  projectId: string | null
  visibility: MarketplaceVisibility
  reviewText: string | null
  createdAt: string
}

export interface CreateMarketplaceRatingInput {
  freelancerId: string
  source: RatingSource
  rating: number
  reviewerType: string
  projectId?: string
  visibility?: MarketplaceVisibility
  reviewText?: string
}

export interface AggregatedRating {
  average: number
  count: number
  bySource: Partial<Record<RatingSource, { average: number; count: number }>>
}

// ─── Portfolio ─────────────────────────────────────────────────────────────

export interface PortfolioMarketplaceExtensions {
  isMarketplaceVisible: boolean
  featured: boolean
}

// ─── Contracts ─────────────────────────────────────────────────────────────

export interface MarketplaceContract {
  id: string
  tenantId: string
  projectId: string | null
  opportunityId: string | null
  status: ContractStatus
  title: string
  terms: Record<string, unknown>
  documentPath: string | null
  effectiveDate: string | null
  expiresAt: string | null
  signedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface ContractParty {
  id: string
  contractId: string
  partyType: ContractPartyType
  entityType: string
  entityId: string
  signedAt: string | null
  signatureReference: string | null
}

export interface CreateContractInput {
  opportunityId?: string
  projectId?: string
  title: string
  terms: Record<string, unknown>
  parties: Array<{
    partyType: ContractPartyType
    entityType: string
    entityId: string
  }>
}

// ─── Invitations ───────────────────────────────────────────────────────────

export interface MarketplaceInvitation {
  id: string
  tenantId: string
  type: InvitationType
  opportunityId: string | null
  freelancerId: string
  listingId: string | null
  status: InvitationStatus
  proposal: InvitationProposal | null
  message: string | null
  expiresAt: string | null
  respondedAt: string | null
  createdBy: string | null
  createdAt: string
}

export interface InvitationProposal {
  rate?: number
  currency?: string
  availability?: string
  coverNote?: string
  portfolioItemIds?: string[]
  estimatedDuration?: string
}

export interface CreateInvitationInput {
  type: InvitationType
  opportunityId?: string
  freelancerId: string
  listingId?: string
  message?: string
  expiresAt?: string
  proposal?: InvitationProposal
}

// ─── Matching ──────────────────────────────────────────────────────────────

export interface MarketplaceMatchContext {
  source: MatchSource
  opportunityId: string
  candidatePool: 'tenant' | 'marketplace' | 'combined'
  filters?: Record<string, unknown>
}

export interface MatchResult {
  freelancerId: string
  score: number
  rationale: string | null
  skillOverlap: string[]
  rank: number | null
  source: MatchSource
}

// ─── Recommendations ───────────────────────────────────────────────────────

export interface MarketplaceRecommendation {
  id: string
  tenantId: string
  type: RecommendationType
  sourceEntityType: string
  sourceEntityId: string
  targetEntityType: string
  targetEntityId: string
  score: number
  rationale: string | null
  metadata: Record<string, unknown>
  expiresAt: string | null
  dismissedAt: string | null
  createdAt: string
}

export interface CreateRecommendationInput {
  type: RecommendationType
  sourceEntityType: string
  sourceEntityId: string
  targetEntityType: string
  targetEntityId: string
  score: number
  rationale?: string
  metadata?: Record<string, unknown>
  expiresAt?: string
}

// ─── Row types (DB mapping) ──────────────────────────────────────────────────

export interface TalentAvailabilityBlockRow {
  id: string
  tenant_id: string
  freelancer_id: string
  block_type: AvailabilityBlockType
  starts_at: string
  ends_at: string
  capacity_pct: number
  timezone: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MarketplaceRatingRow {
  id: string
  tenant_id: string
  freelancer_id: string
  source: RatingSource
  rating: number
  reviewer_type: string
  reviewer_id: string | null
  project_id: string | null
  visibility: MarketplaceVisibility
  review_text: string | null
  created_at: string
}

export interface MarketplaceContractRow {
  id: string
  tenant_id: string
  project_id: string | null
  opportunity_id: string | null
  status: ContractStatus
  title: string
  terms: Record<string, unknown>
  document_path: string | null
  effective_date: string | null
  expires_at: string | null
  signed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MarketplaceInvitationRow {
  id: string
  tenant_id: string
  type: InvitationType
  opportunity_id: string | null
  freelancer_id: string
  listing_id: string | null
  status: InvitationStatus
  proposal: InvitationProposal | null
  message: string | null
  expires_at: string | null
  responded_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MarketplaceRecommendationRow {
  id: string
  tenant_id: string
  type: RecommendationType
  source_entity_type: string
  source_entity_id: string
  target_entity_type: string
  target_entity_id: string
  score: number
  rationale: string | null
  metadata: Record<string, unknown>
  expires_at: string | null
  dismissed_at: string | null
  created_at: string
}
