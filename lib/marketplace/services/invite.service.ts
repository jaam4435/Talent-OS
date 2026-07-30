import { isDomainError } from '@/modules/core/utils/errors'
import type { MarketplaceInvitationRepository } from '@/lib/repositories/marketplace/invitation.repository'
import { MarketplaceEvents } from '@/modules/marketplace/events'
import type {
  CreateInvitationInput,
  InvitationStatus,
  MarketplaceInvitation,
} from '@/modules/marketplace/types'
import { createInvitationSchema } from '@/modules/marketplace/validation'
import type { WorkflowService } from '@/lib/services/workflow.service'

export class MarketplaceInviteService {
  constructor(
    private readonly invitations: MarketplaceInvitationRepository,
    private readonly workflow?: WorkflowService
  ) {}

  async createInvitation(
    tenantId: string,
    userId: string,
    input: CreateInvitationInput
  ): Promise<{ ok: true; invitationId: string } | { ok: false; error: string }> {
    const parsed = createInvitationSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      const invitationId = await this.invitations.create(tenantId, userId, parsed.data)

      if (this.workflow) {
        await this.workflow.emitEvent({
          tenantId,
          eventType: MarketplaceEvents.INVITATION_SENT,
          aggregateType: 'marketplace_invitation',
          aggregateId: invitationId,
          idempotencyKey: `marketplace-invite:${invitationId}`,
          actorId: userId,
          payload: {
            invitation_id: invitationId,
            type: parsed.data.type,
            freelancer_id: parsed.data.freelancerId,
            opportunity_id: parsed.data.opportunityId,
          },
        })
      }

      return { ok: true, invitationId }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Create failed' }
    }
  }

  async respondToInvitation(
    tenantId: string,
    invitationId: string,
    freelancerId: string,
    response: 'accepted' | 'declined',
    proposal?: CreateInvitationInput['proposal']
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await this.invitations.respond(tenantId, invitationId, response, proposal ?? null)

      if (this.workflow && response === 'accepted') {
        await this.workflow.emitEvent({
          tenantId,
          eventType: MarketplaceEvents.APPLICATION_RECEIVED,
          aggregateType: 'marketplace_invitation',
          aggregateId: invitationId,
          idempotencyKey: `marketplace-application:${invitationId}`,
          actorId: null,
          payload: { invitation_id: invitationId, freelancer_id: freelancerId },
        })
      }

      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Respond failed' }
    }
  }

  async listInvitations(
    tenantId: string,
    filters?: { opportunityId?: string; freelancerId?: string; status?: InvitationStatus }
  ): Promise<MarketplaceInvitation[]> {
    return this.invitations.list(tenantId, filters)
  }
}
