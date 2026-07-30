import { isDomainError } from '@/modules/core/utils/errors'
import type { AssignmentService } from '@/lib/services/assignment.service'
import type { AIService } from '@/lib/services/ai.service'
import type { TalentService } from '@/lib/services/talent.service'
import type { CRMService } from '@/lib/services/crm.service'
import { MarketplaceEvents } from '@/modules/marketplace/events'
import type { MarketplaceMatchContext, MatchResult } from '@/modules/marketplace/types'
import type { WorkflowService } from '@/lib/services/workflow.service'

export class MarketplaceMatchingService {
  constructor(
    private readonly ai: AIService,
    private readonly assignment: AssignmentService,
    private readonly talent: TalentService,
    private readonly crm: CRMService,
    private readonly workflow?: WorkflowService
  ) {}

  async runMatch(
    tenantId: string,
    context: MarketplaceMatchContext
  ): Promise<{ ok: true; results: MatchResult[] } | { ok: false; error: string }> {
    try {
      if (context.candidatePool === 'tenant') {
        await this.ai.requestTalentMatch({
          tenantId,
          opportunityId: context.opportunityId,
          actorId: (context.filters?.actorId as string | undefined) ?? '',
        })

        const scores = await this.getMatchResults(tenantId, context.opportunityId)
        await this.emitMatchCompleted(tenantId, context, scores)
        return { ok: true, results: scores }
      }

      const candidates = await this.resolveCandidatePool(tenantId, context)
      const scored = await this.scoreCandidatesRuleBased(candidates, context)

      if (this.workflow) {
        await this.workflow.emitEvent({
          tenantId,
          eventType: MarketplaceEvents.MATCH_COMPLETED,
          aggregateType: 'opportunity',
          aggregateId: context.opportunityId,
          idempotencyKey: `marketplace-match:${context.opportunityId}:${context.candidatePool}`,
          payload: {
            opportunity_id: context.opportunityId,
            candidate_pool: context.candidatePool,
            match_count: scored.length,
            source: context.source,
          },
        })
      }

      return { ok: true, results: scored }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Match failed' }
    }
  }

  async getMatchResults(tenantId: string, opportunityId: string): Promise<MatchResult[]> {
    const rows = await this.assignment.listDetailedMatchScores(opportunityId, tenantId)
    return rows.map((row) => ({
      freelancerId: row.freelancer_id as string,
      score: Number(row.score),
      rationale: row.rationale as string | null,
      skillOverlap: (row.skill_overlap as string[]) ?? [],
      rank: row.rank as number | null,
      source: (row.match_source as MatchResult['source']) ?? 'ai',
    }))
  }

  private async resolveCandidatePool(tenantId: string, context: MarketplaceMatchContext) {
    const excludedIds = await this.crm.listRecipientFreelancerIds(context.opportunityId)
    const opportunity = await this.crm.getOpportunityDetail(context.opportunityId, tenantId)

    if (context.candidatePool === 'marketplace') {
      const marketplace = await this.talent.searchRosterQuery(tenantId, {
        availability: 'available',
        discipline: opportunity?.discipline ?? undefined,
        limit: 50,
        offset: 0,
      })
      return marketplace
        .filter((f) => !excludedIds.includes(f.id))
        .map((f) => ({
          id: f.id,
          skills: f.skills,
          availability: f.availability,
          internal_rating: f.internal_rating,
        }))
    }

    const tenantCandidates = await this.talent.listMatchCandidates(tenantId, {
      discipline: opportunity?.discipline ?? null,
      excludedIds,
    })

    return tenantCandidates
  }

  private async scoreCandidatesRuleBased(
    candidates: Array<{
      id: string
      skills?: string[]
      availability?: string
      internal_rating?: number | null
    }>,
    context: MarketplaceMatchContext
  ): Promise<MatchResult[]> {
    return candidates
      .map((candidate, index) => {
        let score = 50
        if (candidate.availability === 'available') score += 20
        if ((candidate.internal_rating ?? 0) >= 4) score += 15
        score += Math.min((candidate.skills?.length ?? 0) * 2, 15)

        return {
          freelancerId: candidate.id,
          score: Math.min(score, 100),
          rationale: `Rule-based score for ${context.candidatePool} pool`,
          skillOverlap: candidate.skills?.slice(0, 5) ?? [],
          rank: index + 1,
          source: context.source,
        } satisfies MatchResult
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
  }

  private async emitMatchCompleted(
    tenantId: string,
    context: MarketplaceMatchContext,
    results: MatchResult[]
  ) {
    if (!this.workflow) return
    await this.workflow.emitEvent({
      tenantId,
      eventType: MarketplaceEvents.MATCH_COMPLETED,
      aggregateType: 'opportunity',
      aggregateId: context.opportunityId,
      idempotencyKey: `marketplace-match:${context.opportunityId}:tenant`,
      payload: {
        opportunity_id: context.opportunityId,
        match_count: results.length,
        source: context.source,
      },
    })
  }
}
