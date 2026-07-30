import { isDomainError } from '@/modules/core/utils/errors'
import type { MarketplaceContractRepository } from '@/lib/repositories/marketplace/contract.repository'
import { MarketplaceEvents } from '@/modules/marketplace/events'
import type { CreateContractInput, MarketplaceContract } from '@/modules/marketplace/types'
import { createContractSchema } from '@/modules/marketplace/validation'
import type { WorkflowService } from '@/lib/services/workflow.service'

export class MarketplaceContractService {
  constructor(
    private readonly contracts: MarketplaceContractRepository,
    private readonly workflow?: WorkflowService
  ) {}

  async createContract(
    tenantId: string,
    userId: string,
    input: CreateContractInput
  ): Promise<{ ok: true; contractId: string } | { ok: false; error: string }> {
    const parsed = createContractSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      const contractId = await this.contracts.create(tenantId, userId, {
        opportunityId: parsed.data.opportunityId,
        projectId: parsed.data.projectId,
        title: parsed.data.title,
        terms: parsed.data.terms,
      })

      for (const party of parsed.data.parties) {
        await this.contracts.addParty(contractId, party)
      }

      await this.contracts.addEvent(contractId, 'contract.created', userId, {
        title: parsed.data.title,
      })

      return { ok: true, contractId }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Create failed' }
    }
  }

  async getContract(tenantId: string, contractId: string): Promise<MarketplaceContract | null> {
    return this.contracts.findById(tenantId, contractId)
  }

  async sendContract(
    tenantId: string,
    contractId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await this.contracts.updateStatus(tenantId, contractId, 'sent')
      await this.contracts.addEvent(contractId, 'contract.sent', null)
      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Send failed' }
    }
  }

  async recordSignature(
    tenantId: string,
    contractId: string,
    partyId: string,
    signatureReference: string,
    actorId?: string | null
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await this.contracts.recordSignature(partyId, signatureReference)
      await this.contracts.updateStatus(tenantId, contractId, 'signed')
      await this.contracts.addEvent(contractId, 'contract.signed', actorId ?? null, {
        party_id: partyId,
        signature_reference: signatureReference,
      })

      if (this.workflow) {
        await this.workflow.emitEvent({
          tenantId,
          eventType: MarketplaceEvents.CONTRACT_SIGNED,
          aggregateType: 'marketplace_contract',
          aggregateId: contractId,
          idempotencyKey: `marketplace-contract-signed:${contractId}`,
          actorId,
          payload: { contract_id: contractId, party_id: partyId },
        })
      }

      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Signature failed' }
    }
  }
}
