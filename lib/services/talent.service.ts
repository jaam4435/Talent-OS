import type { ActionResult } from '@/modules/core/utils/result'
import { actionFail, actionOk, catchToActionResult } from '@/modules/core/utils/result'
import { parseSchema } from '@/modules/core/utils/validation'
import {
  toFreelancerInsertRow,
  toFreelancerSelfUpdateRow,
  toFreelancerUpdateRow,
} from '@/lib/domains/talent/mappers/freelancer.mapper'
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
import type { Repositories } from '@/lib/repositories/factory'
import type { Tables } from '@/modules/core/types/database'
import type { TenantContext } from '@/modules/core/types/enums'

export type TalentRow = Tables<'freelancers'>

export class TalentService {
  constructor(private readonly repos: Repositories) {}

  async createFreelancer(
    tenant: TenantContext,
    input: FreelancerProfileInput
  ): Promise<ActionResult<{ freelancerId: string }>> {
    try {
      const data = parseSchema(freelancerProfileSchema, input)
      const row = toFreelancerInsertRow(tenant.id, data, tenant.currency)
      const freelancerId = await this.repos.talent.create(row)
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
      await this.repos.talent.update(freelancerId, tenant.id, row)
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
      const freelancerId = await this.repos.talent.findIdByUserId(userId, tenant.id)

      if (!freelancerId) {
        return actionFail('No freelancer profile linked to your account.')
      }

      const row = toFreelancerSelfUpdateRow(data)
      await this.repos.talent.updateSelf(freelancerId, row)
      return actionOk({ freelancerId })
    } catch (error) {
      return catchToActionResult(error)
    }
  }

  async deleteFreelancer(freelancerId: string, tenantId: string): Promise<ActionResult> {
    try {
      await this.repos.talent.delete(freelancerId, tenantId)
      return actionOk()
    } catch (error) {
      return catchToActionResult(error)
    }
  }

  async getOwnFreelancerId(userId: string, tenantId: string): Promise<string | null> {
    return this.repos.talent.findIdByUserId(userId, tenantId)
  }

  async getTalentName(freelancerId: string): Promise<string | null> {
    return this.repos.talent.findNameById(freelancerId)
  }

  async getTalentProfile(freelancerId: string, tenantId: string): Promise<TalentRow | null> {
    return this.repos.talent.findById(freelancerId, tenantId)
  }

  async getTalentActivity(freelancerId: string, limit = 10) {
    return this.repos.activityLog.listByEntity('freelancer', freelancerId, limit)
  }

  async searchRoster(tenantId: string, params: TalentSearchParams): Promise<TalentRow[]> {
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
    return this.repos.talent.search(tenantId, query)
  }

  async searchRosterQuery(tenantId: string, params: TalentSearchQuery): Promise<TalentRow[]> {
    return this.repos.talent.search(tenantId, params)
  }

  async getRatingHistory(freelancerId: string): Promise<RatingHistoryEntry[]> {
    return this.repos.rating.findHistoryByFreelancerId(freelancerId)
  }

  async listForProjectForm(tenantId: string) {
    return this.repos.talent.listForProjectForm(tenantId)
  }

  async findContactById(freelancerId: string) {
    return this.repos.talent.findContactById(freelancerId)
  }

  async findUserIdByFreelancerId(freelancerId: string) {
    return this.repos.talent.findUserIdByFreelancerId(freelancerId)
  }

  async listMatchCandidates(
    tenantId: string,
    options: { discipline?: string | null; excludedIds: string[] }
  ) {
    return this.repos.talent.listMatchCandidates(tenantId, options)
  }

  async suggestForOpportunity(opportunityId: string) {
    return this.repos.talent.suggestForOpportunity(opportunityId)
  }

  async findSkillsByIds(freelancerIds: string[]) {
    return this.repos.talent.findSkillsByIds(freelancerIds)
  }

  async findByPhone(tenantId: string, phone: string) {
    return this.repos.talent.findByPhone(tenantId, phone)
  }

  async findByIds(freelancerIds: string[], columns?: string) {
    return this.repos.talent.findByIds(freelancerIds, columns)
  }
}
