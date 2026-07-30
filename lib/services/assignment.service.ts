import type { Repositories } from '@/lib/repositories/factory'
import type { ShortlistItemView } from '@/lib/shortlists/types'
import type { BroadcastOpportunityInput } from '@/lib/opportunities/types'
import type { NotificationService } from '@/lib/services/notification.service'
import type { WorkflowService } from '@/lib/services/workflow.service'

export class AssignmentService {
  constructor(
    private readonly repos: Repositories,
    private readonly notifications: NotificationService,
    private readonly workflow: WorkflowService
  ) {}

  async broadcastOpportunity(
    tenantId: string,
    userId: string,
    tenantName: string,
    tenantSlug: string,
    input: BroadcastOpportunityInput
  ): Promise<{ ok: true; recipientCount: number } | { ok: false; error: string }> {
    const opportunity = await this.repos.lead.findBroadcastContext(input.opportunityId, tenantId)

    if (!opportunity) {
      return { ok: false, error: 'Opportunity not found' }
    }

    if (!['draft', 'open'].includes(opportunity.status)) {
      return { ok: false, error: 'Opportunity cannot be broadcast in its current status' }
    }

    const freelancers = await this.repos.talent.findBroadcastTargets(tenantId, input.freelancerIds)
    if (!freelancers.length) {
      return { ok: false, error: 'No valid freelancers selected' }
    }

    const recipientRows = freelancers.map((f) => ({
      opportunity_id: opportunity.id,
      freelancer_id: f.id,
      tenant_id: tenantId,
      response: 'pending' as const,
    }))

    let insertedRecipients: Array<{ id: string; freelancer_id: string }>
    try {
      insertedRecipients = await this.repos.lead.upsertRecipients(recipientRows)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Broadcast failed' }
    }

    if (opportunity.status === 'draft') {
      try {
        await this.repos.lead.updateStatus(opportunity.id, 'open')
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Status update failed' }
      }
    }

    const freelancerMap = new Map(freelancers.map((f) => [f.id, f]))
    await this.notifications.createMany(
      freelancers
        .filter((f) => f.user_id)
        .map((f) => ({
          tenant_id: tenantId,
          user_id: f.user_id!,
          type: 'opportunity_broadcast',
          title: 'New opportunity',
          body: opportunity.title,
          data: { opportunity_id: opportunity.id, freelancer_id: f.id },
        }))
    )

    const recipientsPayload = insertedRecipients.map((r) => {
      const freelancer = freelancerMap.get(r.freelancer_id)
      return {
        recipient_id: r.id,
        freelancer_id: r.freelancer_id,
        full_name: freelancer?.full_name ?? 'Freelancer',
        phone: freelancer?.phone ?? null,
        email: freelancer?.email ?? null,
      }
    })

    await this.workflow.emitEvent({
      tenantId,
      eventType: 'opportunity.broadcast',
      aggregateType: 'opportunity',
      aggregateId: opportunity.id,
      idempotencyKey: `opp-broadcast:${opportunity.id}:${input.freelancerIds.sort().join(',')}`,
      actorId: userId,
      payload: {
        opportunity_id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        budget: opportunity.budget,
        currency: opportunity.currency,
        response_deadline: opportunity.response_deadline,
        agency_name: tenantName,
        agency_slug: tenantSlug,
        recipients: recipientsPayload,
      },
    })

    return { ok: true, recipientCount: recipientsPayload.length }
  }

  async getOrCreateShortlist(opportunityId: string, tenantId: string, createdBy: string) {
    return this.repos.shortlist.getOrCreate(opportunityId, tenantId, createdBy)
  }

  async getShortlistItems(
    opportunityId: string,
    tenantId: string
  ): Promise<{ shortlistId: string | null; items: ShortlistItemView[] }> {
    const shortlist = await this.repos.shortlist.findByOpportunity(opportunityId, tenantId)
    if (!shortlist) {
      return { shortlistId: null, items: [] }
    }

    const items = await this.repos.shortlist.listActiveItems(shortlist.id)
    const freelancerIds = items.map((i) => i.freelancer_id)

    const [freelancers, scores, recipients] = await Promise.all([
      this.repos.talent.findByIds(freelancerIds),
      this.repos.matchScore.findByOpportunity(opportunityId),
      this.repos.lead.listRecipientsByOpportunity(opportunityId),
    ])

    const freelancerMap = new Map(freelancers.map((f) => [f.id as string, f]))
    const scoreMap = new Map(scores.map((s) => [s.freelancer_id, s.score]))
    const responseMap = new Map(recipients.map((r) => [r.freelancer_id, r.response]))

    const views: ShortlistItemView[] = items
      .map((item) => {
        const freelancer = freelancerMap.get(item.freelancer_id)
        if (!freelancer) return null

        return {
          id: item.id,
          freelancerId: item.freelancer_id,
          rank: item.rank,
          notes: item.notes,
          status: item.status,
          rejectionReason: item.rejection_reason,
          freelancer: {
            id: freelancer.id as string,
            full_name: freelancer.full_name as string,
            email: freelancer.email as string,
            discipline: freelancer.discipline as string,
            day_rate: freelancer.day_rate as number | null,
            currency: freelancer.currency as string,
            availability: freelancer.availability as string,
            internal_rating: freelancer.internal_rating as number | null,
          },
          matchScore: scoreMap.get(item.freelancer_id) ?? null,
          response: responseMap.get(item.freelancer_id) ?? null,
        }
      })
      .filter((item): item is ShortlistItemView => item !== null)

    return { shortlistId: shortlist.id, items: views }
  }

  async addToShortlist(
    opportunityId: string,
    tenantId: string,
    userId: string,
    freelancerIds: string[]
  ): Promise<{ ok: true; shortlistId: string } | { ok: false; error: string }> {
    if (!freelancerIds.length) {
      return { ok: false, error: 'Select at least one freelancer' }
    }

    const exists = await this.repos.lead.existsInTenant(opportunityId, tenantId)
    if (!exists) {
      return { ok: false, error: 'Opportunity not found' }
    }

    const shortlistId = await this.getOrCreateShortlist(opportunityId, tenantId, userId)
    const maxRank = await this.repos.shortlist.findMaxRank(shortlistId)
    let nextRank = maxRank + 1

    const rows = freelancerIds.map((freelancerId) => ({
      shortlist_id: shortlistId,
      freelancer_id: freelancerId,
      tenant_id: tenantId,
      rank: nextRank++,
      status: 'active' as const,
    }))

    try {
      await this.repos.shortlist.upsertItems(rows)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Add failed' }
    }

    return { ok: true, shortlistId }
  }

  async updateShortlistItem(
    itemId: string,
    tenantId: string,
    input: { rank?: number; notes?: string }
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const patch: Record<string, unknown> = {}
    if (input.rank !== undefined) patch.rank = input.rank
    if (input.notes !== undefined) patch.notes = input.notes || null

    try {
      await this.repos.shortlist.updateItem(itemId, tenantId, patch)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Update failed' }
    }

    return { ok: true }
  }

  async rejectShortlistCandidate(
    itemId: string,
    tenantId: string,
    reason: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!reason.trim()) {
      return { ok: false, error: 'Rejection reason is required' }
    }

    try {
      await this.repos.shortlist.rejectItem(itemId, tenantId, reason)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Reject failed' }
    }

    return { ok: true }
  }

  async addRespondentsToShortlist(
    opportunityId: string,
    tenantId: string,
    userId: string
  ): Promise<{ ok: true; shortlistId: string } | { ok: false; error: string }> {
    const freelancerIds = await this.repos.lead.listInterestedFreelancerIds(opportunityId)
    if (!freelancerIds.length) {
      return { ok: false, error: 'No interested responses to add' }
    }

    return this.addToShortlist(opportunityId, tenantId, userId, freelancerIds)
  }

  async upsertMatchScores(
    rows: Array<{
      tenant_id: string
      opportunity_id: string
      freelancer_id: string
      ai_request_id: string
      score: number
      rationale: string
      skill_overlap: string[]
      rank: number
    }>
  ) {
    await this.repos.matchScore.upsertScores(rows)
  }

  async listDetailedMatchScores(opportunityId: string, tenantId: string) {
    return this.repos.matchScore.listDetailedByOpportunity(opportunityId, tenantId)
  }

  async listTopMatchScores(opportunityId: string) {
    return this.repos.matchScore.listTopScoresByOpportunity(opportunityId)
  }
}
