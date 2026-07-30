import type { ActionResult } from '@/lib/core/result'
import { actionFail, actionOk, catchToActionResult } from '@/lib/core/result'
import { parseSchema } from '@/lib/core/validation'
import {
  toFreelancerInsertRow,
  toFreelancerSelfUpdateRow,
  toFreelancerUpdateRow,
} from '@/lib/domains/talent/mappers/freelancer.mapper'
import type { FreelancerRepository } from '@/lib/domains/talent/repositories/freelancer.repository'
import type { RatingRepository } from '@/lib/domains/talent/repositories/rating.repository'
import type {
  FreelancerProfileInput,
  FreelancerSelfProfileInput,
  RatingHistoryEntry,
  TalentSearchParams,
  TalentSearchQuery,
} from '@/lib/domains/talent/types'
import {
  freelancerProfileSchema,
  freelancerSelfProfileSchema,
} from '@/lib/domains/talent/validation'
import type { Tables } from '@/types/database'
import type { TenantContext } from '@/types/enums'

export class TalentService {
  constructor(private readonly freelancers: FreelancerRepository) {}

  async createFreelancer(
    tenant: TenantContext,
    input: FreelancerProfileInput
  ): Promise<ActionResult<{ freelancerId: string }>> {
    try {
      const data = parseSchema(freelancerProfileSchema, input)
      const row = toFreelancerInsertRow(tenant.id, data, tenant.currency)
      const freelancerId = await this.freelancers.create(row)
      return actionOk({ freelancerId })
    } catch (error) {
      return catchToActionResult(error)
    }
  }

  async updateFreelancer(
    freelancerId: string,
    tenant: TenantContext,
    input: FreelancerProfileInput
  ): Promise<ActionResult> {
    try {
      const data = parseSchema(freelancerProfileSchema, input)
      const row = toFreelancerUpdateRow(data, tenant.currency)
      await this.freelancers.update(freelancerId, tenant.id, row)
      return actionOk()
    } catch (error) {
      return catchToActionResult(error)
    }
  }

  async updateOwnProfile(
    userId: string,
    tenant: TenantContext,
    input: FreelancerSelfProfileInput
  ): Promise<ActionResult<{ freelancerId: string }>> {
    try {
      const data = parseSchema(freelancerSelfProfileSchema, input)
      const freelancerId = await this.freelancers.findIdByUserId(userId, tenant.id)

      if (!freelancerId) {
        return actionFail('No freelancer profile linked to your account.')
      }

      const row = toFreelancerSelfUpdateRow(data)
      await this.freelancers.updateSelf(freelancerId, row)
      return actionOk({ freelancerId })
    } catch (error) {
      return catchToActionResult(error)
    }
  }

  async deleteFreelancer(freelancerId: string, tenantId: string): Promise<ActionResult> {
    try {
      await this.freelancers.delete(freelancerId, tenantId)
      return actionOk()
    } catch (error) {
      return catchToActionResult(error)
    }
  }

  async getOwnFreelancerId(userId: string, tenantId: string): Promise<string | null> {
    return this.freelancers.findIdByUserId(userId, tenantId)
  }

  async searchRoster(tenantId: string, params: TalentSearchParams): Promise<Tables<'freelancers'>[]> {
    const limit = params.limit ?? 20
    const page = params.page ?? 1
    const query: TalentSearchQuery = {
      query: params.query,
      discipline: params.discipline,
      availability: params.availability,
      minRate: params.minRate,
      maxRate: params.maxRate,
      minRating: params.minRating,
      sort: params.sort ?? 'rating',
      limit,
      offset: (page - 1) * limit,
    }

    return this.freelancers.search(tenantId, query)
  }
}

export class TalentQueryService {
  constructor(
    private readonly freelancers: FreelancerRepository,
    private readonly ratings: RatingRepository
  ) {}

  searchRoster(tenantId: string, params: TalentSearchQuery): Promise<Tables<'freelancers'>[]> {
    return this.freelancers.search(tenantId, params)
  }

  getRatingHistory(freelancerId: string): Promise<RatingHistoryEntry[]> {
    return this.ratings.findHistoryByFreelancerId(freelancerId)
  }
}
