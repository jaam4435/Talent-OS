/**
 * Marketplace subdomain boundary map.
 * Maps each subdomain to existing components and planned new services.
 */

import type { MarketplaceSubdomain } from '@/modules/marketplace/types'

export interface SubdomainBoundary {
  subdomain: MarketplaceSubdomain
  description: string
  existing: {
    tables?: string[]
    services?: string[]
    repositories?: string[]
    actions?: string[]
    agents?: string[]
    mcpTools?: string[]
  }
  extension: {
    tables?: string[]
    columns?: string[]
    services?: string[]
    events?: string[]
  }
  phase: number
}

export const MARKETPLACE_BOUNDARIES: Record<MarketplaceSubdomain, SubdomainBoundary> = {
  profiles: {
    subdomain: 'profiles',
    description: 'Public-facing talent identity with opt-in marketplace visibility',
    existing: {
      tables: ['freelancers', 'talent_profiles'],
      services: ['TalentService'],
      repositories: ['TalentRepository'],
      actions: ['app/actions/freelancers.ts'],
      agents: ['recruiter'],
      mcpTools: ['talent_search', 'talent_get_profile'],
    },
    extension: {
      columns: [
        'freelancers.marketplace_visibility',
        'freelancers.public_slug',
        'freelancers.marketplace_headline',
        'freelancers.marketplace_bio',
        'freelancers.marketplace_published_at',
      ],
      services: ['MarketplaceProfileService'],
      events: ['marketplace.profile_published'],
    },
    phase: 1,
  },
  availability: {
    subdomain: 'availability',
    description: 'Structured calendar blocks beyond availability enum',
    existing: {
      tables: ['freelancers'],
      services: ['TalentService'],
    },
    extension: {
      columns: ['freelancers.availability'],
      tables: ['talent_availability_blocks'],
      services: ['MarketplaceAvailabilityService'],
    },
    phase: 2,
  },
  ratings: {
    subdomain: 'ratings',
    description: 'Public/client ratings separate from internal manager ratings',
    existing: {
      tables: ['freelancers', 'freelancer_rating_history'],
      services: ['TalentService'],
      repositories: ['RatingRepository'],
      mcpTools: ['talent_get_rating_history'],
    },
    extension: {
      tables: ['marketplace_ratings'],
      services: ['MarketplaceRatingService'],
    },
    phase: 3,
  },
  portfolio: {
    subdomain: 'portfolio',
    description: 'Work samples with per-item marketplace visibility',
    existing: {
      tables: ['freelancer_portfolio_items'],
      services: ['TalentService'],
      repositories: ['PortfolioRepository'],
      actions: ['app/actions/portfolio.ts'],
      mcpTools: ['talent_list_portfolio'],
    },
    extension: {
      columns: [
        'freelancer_portfolio_items.is_marketplace_visible',
        'freelancer_portfolio_items.featured',
      ],
      services: ['MarketplacePortfolioService'],
    },
    phase: 1,
  },
  contracts: {
    subdomain: 'contracts',
    description: 'Legal engagement lifecycle before project start',
    existing: {},
    extension: {
      tables: [
        'marketplace_contracts',
        'marketplace_contract_parties',
        'marketplace_contract_events',
      ],
      services: ['ContractService'],
      events: ['marketplace.contract_signed'],
    },
    phase: 4,
  },
  invitations: {
    subdomain: 'invitations',
    description: 'Gig invitations with proposals — distinct from team and broadcast invites',
    existing: {
      tables: ['opportunity_recipients', 'member_invites'],
      services: ['AssignmentService'],
      actions: ['app/actions/shortlists.ts'],
    },
    extension: {
      tables: ['marketplace_invitations'],
      services: ['MarketplaceInviteService'],
      events: ['marketplace.invitation_sent', 'marketplace.application_received'],
    },
    phase: 2,
  },
  matching: {
    subdomain: 'matching',
    description: 'Talent-opportunity ranking with marketplace candidate pool',
    existing: {
      tables: ['talent_match_scores', 'ai_requests'],
      services: ['AIService', 'AssignmentService'],
      actions: ['app/actions/ai.ts'],
      agents: ['recruiter'],
      mcpTools: ['ai_match_talent', 'ai_shortlist_summary'],
    },
    extension: {
      columns: ['talent_match_scores.match_source', 'talent_match_scores.match_context'],
      services: ['MarketplaceMatchingService'],
      events: ['marketplace.match_completed'],
    },
    phase: 2,
  },
  recommendations: {
    subdomain: 'recommendations',
    description: 'Proactive talent/opportunity suggestions beyond single-opportunity matching',
    existing: {
      tables: ['talent_match_scores'],
      services: ['AIService'],
      agents: ['recruiter'],
    },
    extension: {
      tables: ['marketplace_recommendations'],
      services: ['MarketplaceRecommendationService'],
      events: ['marketplace.recommendation_generated'],
    },
    phase: 3,
  },
}

export function getSubdomainBoundary(subdomain: MarketplaceSubdomain): SubdomainBoundary {
  return MARKETPLACE_BOUNDARIES[subdomain]
}

export function listBoundariesByPhase(phase: number): SubdomainBoundary[] {
  return Object.values(MARKETPLACE_BOUNDARIES).filter((b) => b.phase === phase)
}
