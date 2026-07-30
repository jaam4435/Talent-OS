import { isDomainError } from '@/modules/core/utils/errors'
import type { AvailabilityBlockRepository } from '@/lib/repositories/marketplace/availability-block.repository'
import type {
  AvailabilityCheckParams,
  AvailabilityCheckResult,
  CreateAvailabilityBlockInput,
} from '@/modules/marketplace/types'
import { createAvailabilityBlockSchema } from '@/modules/marketplace/validation'

export class MarketplaceAvailabilityService {
  constructor(private readonly blocks: AvailabilityBlockRepository) {}

  async createBlock(
    tenantId: string,
    input: CreateAvailabilityBlockInput
  ): Promise<{ ok: true; blockId: string } | { ok: false; error: string }> {
    const parsed = createAvailabilityBlockSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      const blockId = await this.blocks.create(tenantId, parsed.data)
      return { ok: true, blockId }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Create failed' }
    }
  }

  async listBlocks(tenantId: string, freelancerId: string) {
    return this.blocks.listByFreelancer(tenantId, freelancerId)
  }

  async checkAvailability(
    tenantId: string,
    params: AvailabilityCheckParams
  ): Promise<AvailabilityCheckResult> {
    const check = await this.blocks.checkAvailability(
      params.freelancerId,
      params.startsAt,
      params.endsAt
    )
    const blocks = await this.blocks.listByFreelancer(tenantId, params.freelancerId)
    const conflictingBlocks = blocks.filter(
      (b) =>
        ['busy', 'booked', 'time_off'].includes(b.blockType) &&
        b.startsAt < params.endsAt &&
        b.endsAt > params.startsAt
    )

    const profile = blocks.length ? null : null
    void profile

    return {
      available: check.available,
      conflictingBlocks,
      summaryStatus: check.available ? 'available' : 'conflict',
    }
  }

  async deleteBlock(
    tenantId: string,
    blockId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await this.blocks.delete(tenantId, blockId)
      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Delete failed' }
    }
  }
}
