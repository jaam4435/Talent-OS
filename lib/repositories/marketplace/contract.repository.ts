import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type {
  ContractPartyType,
  ContractStatus,
  MarketplaceContract,
  MarketplaceContractRow,
} from '@/modules/marketplace/types'

function mapContract(row: MarketplaceContractRow): MarketplaceContract {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    projectId: row.project_id,
    opportunityId: row.opportunity_id,
    status: row.status,
    title: row.title,
    terms: row.terms,
    documentPath: row.document_path,
    effectiveDate: row.effective_date,
    expiresAt: row.expires_at,
    signedAt: row.signed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class MarketplaceContractRepository extends BaseRepository {
  async create(
    tenantId: string,
    userId: string | null,
    input: {
      opportunityId?: string | null
      projectId?: string | null
      title: string
      terms: Record<string, unknown>
    }
  ): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('marketplace_contracts')
      .insert({
        tenant_id: tenantId,
        opportunity_id: input.opportunityId ?? null,
        project_id: input.projectId ?? null,
        title: input.title,
        terms: input.terms as Json,
        created_by: userId,
        status: 'draft',
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Marketplace contract')
    return data.id
  }

  async findById(tenantId: string, contractId: string): Promise<MarketplaceContract | null> {
    const { data } = await this.ctx.supabase
      .from('marketplace_contracts')
      .select('*')
      .eq('id', contractId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    return data ? mapContract(data as MarketplaceContractRow) : null
  }

  async updateStatus(tenantId: string, contractId: string, status: ContractStatus): Promise<void> {
    const patch: { status: ContractStatus; signed_at?: string } = { status }
    if (status === 'signed') patch.signed_at = new Date().toISOString()

    const { error } = await this.ctx.supabase
      .from('marketplace_contracts')
      .update(patch)
      .eq('id', contractId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }

  async addParty(
    contractId: string,
    input: { partyType: ContractPartyType; entityType: string; entityId: string }
  ): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('marketplace_contract_parties')
      .insert({
        contract_id: contractId,
        party_type: input.partyType,
        entity_type: input.entityType,
        entity_id: input.entityId,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Contract party')
    return data.id
  }

  async recordSignature(
    partyId: string,
    signatureReference: string
  ): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('marketplace_contract_parties')
      .update({
        signed_at: new Date().toISOString(),
        signature_reference: signatureReference,
      })
      .eq('id', partyId)

    this.throwIfError(error)
  }

  async addEvent(
    contractId: string,
    eventType: string,
    actorId: string | null,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const { error } = await this.ctx.supabase.from('marketplace_contract_events').insert({
      contract_id: contractId,
      event_type: eventType,
      actor_id: actorId,
      metadata: (metadata ?? {}) as Json,
    })

    this.throwIfError(error)
  }
}
