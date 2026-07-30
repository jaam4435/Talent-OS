import { isDomainError } from '@/modules/core/utils/errors'
import type { MarketplaceRecommendationRepository } from '@/lib/repositories/marketplace/recommendation.repository'
import { MarketplaceEvents } from '@/modules/marketplace/events'
import type {
  CreateRecommendationInput,
  MarketplaceRecommendation,
  RecommendationType,
} from '@/modules/marketplace/types'
import { createRecommendationSchema } from '@/modules/marketplace/validation'
import type { CRMService } from '@/lib/services/crm.service'
import type { TalentService } from '@/lib/services/talent.service'
import type { MarketplaceMatchingService } from '@/lib/marketplace/services/matching.service'
import type { WorkflowService } from '@/lib/services/workflow.service'

export class MarketplaceRecommendationService {
  constructor(
    private readonly recommendations: MarketplaceRecommendationRepository,
    private readonly crm: CRMService,
    private readonly talent: TalentService,
    private readonly matching: MarketplaceMatchingService,
    private readonly workflow?: WorkflowService
  ) {}

  async createRecommendation(
    tenantId: string,
    input: CreateRecommendationInput
  ): Promise<{ ok: true; recommendationId: string } | { ok: false; error: string }> {
    const parsed = createRecommendationSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      const recommendationId = await this.recommendations.create(tenantId, parsed.data)
      return { ok: true, recommendationId }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Create failed' }
    }
  }

  async listRecommendations(
    tenantId: string,
    filters?: { type?: string; entityType?: string; entityId?: string }
  ): Promise<MarketplaceRecommendation[]> {
    return this.recommendations.listActive(tenantId, {
      type: filters?.type as RecommendationType | undefined,
      entityType: filters?.entityType,
      entityId: filters?.entityId,
    })
  }

  async dismissRecommendation(
    tenantId: string,
    recommendationId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await this.recommendations.dismiss(tenantId, recommendationId)
      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Dismiss failed' }
    }
  }

  /** Generate proactive recommendations from open opportunities and marketplace talent. */
  async generateRecommendations(
    tenantId: string,
    options?: { types?: RecommendationType[] }
  ): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
    try {
      const types = options?.types ?? (['talent_for_opportunity'] as RecommendationType[])
      let created = 0

      if (types.includes('talent_for_opportunity')) {
        const opportunities = await this.crm.getOpportunitiesForPage(tenantId)
        const open = opportunities.filter((o) => o.status === 'open').slice(0, 5)

        for (const opportunity of open) {
          const match = await this.matching.runMatch(tenantId, {
            source: 'marketplace',
            opportunityId: opportunity.id,
            candidatePool: 'combined',
          })
          if (!match.ok) continue

          for (const result of match.results.slice(0, 3)) {
            await this.recommendations.create(tenantId, {
              type: 'talent_for_opportunity',
              sourceEntityType: 'opportunity',
              sourceEntityId: opportunity.id,
              targetEntityType: 'freelancer',
              targetEntityId: result.freelancerId,
              score: result.score,
              rationale: result.rationale ?? undefined,
            })
            created += 1
          }
        }
      }

      if (this.workflow && created > 0) {
        await this.workflow.emitEvent({
          tenantId,
          eventType: MarketplaceEvents.RECOMMENDATION_GENERATED,
          aggregateType: 'tenant',
          aggregateId: tenantId,
          idempotencyKey: `marketplace-recs:${tenantId}:${Date.now()}`,
          payload: { count: created },
        })
      }

      return { ok: true, count: created }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Generate failed' }
    }
  }
}
