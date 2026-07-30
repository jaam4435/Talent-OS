import { z } from 'zod'
import {
  AVAILABILITY_BLOCK_TYPES,
  CONTRACT_PARTY_TYPES,
  INVITATION_TYPES,
  MARKETPLACE_VISIBILITY,
  RATING_SOURCES,
  RECOMMENDATION_TYPES,
} from '@/modules/marketplace/types'

export const publishProfileSchema = z.object({
  freelancerId: z.string().uuid(),
  marketplaceVisibility: z.enum(MARKETPLACE_VISIBILITY),
  publicSlug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/).optional(),
  marketplaceHeadline: z.string().max(200).optional(),
  marketplaceBio: z.string().max(5000).optional(),
})

export const createAvailabilityBlockSchema = z.object({
  freelancerId: z.string().uuid(),
  blockType: z.enum(AVAILABILITY_BLOCK_TYPES),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacityPct: z.number().int().min(0).max(100).optional(),
  timezone: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
})

export const createMarketplaceRatingSchema = z.object({
  freelancerId: z.string().uuid(),
  source: z.enum(RATING_SOURCES),
  rating: z.number().min(1).max(5),
  reviewerType: z.string().min(1).max(50),
  projectId: z.string().uuid().optional(),
  visibility: z.enum(MARKETPLACE_VISIBILITY).optional(),
  reviewText: z.string().max(2000).optional(),
})

export const updatePortfolioVisibilitySchema = z.object({
  portfolioItemId: z.string().uuid(),
  isMarketplaceVisible: z.boolean(),
  featured: z.boolean().optional(),
})

export const createContractSchema = z.object({
  opportunityId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  terms: z.record(z.unknown()),
  parties: z
    .array(
      z.object({
        partyType: z.enum(CONTRACT_PARTY_TYPES),
        entityType: z.string(),
        entityId: z.string().uuid(),
      })
    )
    .min(2),
})

export const createInvitationSchema = z.object({
  type: z.enum(INVITATION_TYPES),
  opportunityId: z.string().uuid().optional(),
  freelancerId: z.string().uuid(),
  listingId: z.string().uuid().optional(),
  message: z.string().max(2000).optional(),
  expiresAt: z.string().datetime().optional(),
  proposal: z
    .object({
      rate: z.number().positive().optional(),
      currency: z.string().length(3).optional(),
      availability: z.string().optional(),
      coverNote: z.string().max(2000).optional(),
      portfolioItemIds: z.array(z.string().uuid()).optional(),
      estimatedDuration: z.string().optional(),
    })
    .optional(),
})

export const createRecommendationSchema = z.object({
  type: z.enum(RECOMMENDATION_TYPES),
  sourceEntityType: z.string(),
  sourceEntityId: z.string().uuid(),
  targetEntityType: z.string(),
  targetEntityId: z.string().uuid(),
  score: z.number().min(0).max(100),
  rationale: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
  expiresAt: z.string().datetime().optional(),
})

export const marketplaceSearchSchema = z.object({
  query: z.string().max(200).optional(),
  discipline: z.string().optional(),
  availability: z.string().optional(),
  minRate: z.number().optional(),
  maxRate: z.number().optional(),
  minRating: z.number().min(1).max(5).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})
