import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type {
  InvitationProposal,
  InvitationStatus,
  InvitationType,
  MarketplaceInvitation,
  MarketplaceInvitationRow,
} from '@/modules/marketplace/types'

function mapInvitation(row: MarketplaceInvitationRow): MarketplaceInvitation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    opportunityId: row.opportunity_id,
    freelancerId: row.freelancer_id,
    listingId: row.listing_id,
    status: row.status,
    proposal: row.proposal,
    message: row.message,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

export class MarketplaceInvitationRepository extends BaseRepository {
  async create(
    tenantId: string,
    userId: string | null,
    input: {
      type: InvitationType
      opportunityId?: string | null
      freelancerId: string
      listingId?: string | null
      message?: string | null
      expiresAt?: string | null
      proposal?: InvitationProposal | null
    }
  ): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('marketplace_invitations')
      .insert({
        tenant_id: tenantId,
        type: input.type,
        opportunity_id: input.opportunityId ?? null,
        freelancer_id: input.freelancerId,
        listing_id: input.listingId ?? null,
        message: input.message ?? null,
        expires_at: input.expiresAt ?? null,
        proposal: (input.proposal ?? null) as Json | null,
        created_by: userId,
        status: 'pending',
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Marketplace invitation')
    return data.id
  }

  async list(
    tenantId: string,
    filters?: { opportunityId?: string; freelancerId?: string; status?: InvitationStatus }
  ): Promise<MarketplaceInvitation[]> {
    let query = this.ctx.supabase
      .from('marketplace_invitations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (filters?.opportunityId) query = query.eq('opportunity_id', filters.opportunityId)
    if (filters?.freelancerId) query = query.eq('freelancer_id', filters.freelancerId)
    if (filters?.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    this.throwIfError(error)
    return (data ?? []).map((row) => mapInvitation(row as MarketplaceInvitationRow))
  }

  async respond(
    tenantId: string,
    invitationId: string,
    status: 'accepted' | 'declined',
    proposal?: InvitationProposal | null
  ): Promise<void> {
    const patch: {
      status: 'accepted' | 'declined'
      responded_at: string
      proposal?: Json
    } = {
      status,
      responded_at: new Date().toISOString(),
    }
    if (proposal) patch.proposal = proposal as Json

    const { error } = await this.ctx.supabase
      .from('marketplace_invitations')
      .update(patch)
      .eq('id', invitationId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }
}
