import type { Repositories } from '@/lib/repositories/factory'
import type { TalentService } from '@/lib/services/talent.service'
import type { AIService } from '@/lib/services/ai.service'
import type { AssignmentService } from '@/lib/services/assignment.service'
import { MARKETPLACE_BOUNDARIES } from '@/lib/marketplace/boundaries'
import type { MarketplaceSubdomain } from '@/modules/marketplace/types'

/** Marketplace orchestration — delegates to domain services, never repositories directly from MCP. */
export class MarketplaceService {
  constructor(
    private readonly repos: Repositories,
    private readonly talent: TalentService,
    private readonly ai: AIService,
    private readonly assignment: AssignmentService
  ) {}

  async searchPublicProfiles(
    tenantId: string,
    input: { query?: string; discipline?: string; page?: number; limit?: number }
  ) {
    const roster = await this.talent.searchRoster(tenantId, {
      query: input.query,
      discipline: input.discipline as never,
    })
    const page = input.page ?? 1
    const limit = Math.min(input.limit ?? 20, 100)
    const offset = (page - 1) * limit
    const items = roster.slice(offset, offset + limit).map((f) => ({
      id: f.id,
      full_name: f.full_name,
      discipline: f.discipline,
      skills: f.skills,
      availability: f.availability,
      day_rate: f.day_rate,
      bio: f.bio,
    }))
    return { items, page, limit, total: roster.length }
  }

  async getPublicProfile(freelancerId: string, tenantId: string) {
    const profile = await this.talent.getTalentProfile(freelancerId, tenantId)
    if (!profile) return null
    return {
      id: profile.id,
      full_name: profile.full_name,
      discipline: profile.discipline,
      skills: profile.skills,
      availability: profile.availability,
      day_rate: profile.day_rate,
      bio: profile.bio,
      tags: profile.tags,
    }
  }

  async getMatchScores(opportunityId: string, tenantId: string) {
    return this.assignment.listDetailedMatchScores(opportunityId, tenantId)
  }

  async requestMatch(input: {
    tenantId: string
    opportunityId: string
    actorId: string
  }) {
    return this.ai.requestTalentMatch(input)
  }

  getSubdomainBoundary(subdomain: MarketplaceSubdomain) {
    return MARKETPLACE_BOUNDARIES[subdomain]
  }

  listBoundaries() {
    return Object.values(MARKETPLACE_BOUNDARIES)
  }
}
