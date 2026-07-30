import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type {
  AvailabilityBlock,
  AvailabilityBlockType,
  TalentAvailabilityBlockRow,
} from '@/modules/marketplace/types'

function mapBlock(row: TalentAvailabilityBlockRow): AvailabilityBlock {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    freelancerId: row.freelancer_id,
    blockType: row.block_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacityPct: row.capacity_pct,
    timezone: row.timezone,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export class AvailabilityBlockRepository extends BaseRepository {
  async create(
    tenantId: string,
    input: {
      freelancerId: string
      blockType: AvailabilityBlockType
      startsAt: string
      endsAt: string
      capacityPct?: number
      timezone?: string
      notes?: string | null
    }
  ): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('talent_availability_blocks')
      .insert({
        tenant_id: tenantId,
        freelancer_id: input.freelancerId,
        block_type: input.blockType,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        capacity_pct: input.capacityPct ?? 100,
        timezone: input.timezone ?? 'UTC',
        notes: input.notes ?? null,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Availability block')
    return data.id
  }

  async listByFreelancer(tenantId: string, freelancerId: string): Promise<AvailabilityBlock[]> {
    const { data, error } = await this.ctx.supabase
      .from('talent_availability_blocks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('freelancer_id', freelancerId)
      .order('starts_at')

    this.throwIfError(error)
    return (data ?? []).map((row) => mapBlock(row as TalentAvailabilityBlockRow))
  }

  async delete(tenantId: string, blockId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('talent_availability_blocks')
      .delete()
      .eq('id', blockId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }

  async checkAvailability(freelancerId: string, startsAt: string, endsAt: string) {
    const { data, error } = await this.ctx.supabase.rpc('check_talent_availability', {
      p_freelancer_id: freelancerId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
    })

    this.throwIfError(error)
    const row = (data as Array<{ available: boolean; conflicting_block_count: number }> | null)?.[0]
    return {
      available: row?.available ?? true,
      conflictingBlockCount: row?.conflicting_block_count ?? 0,
    }
  }

  async sumCapacityInRange(tenantId: string, startsAt: string, endsAt: string): Promise<number> {
    const { data, error } = await this.ctx.supabase
      .from('talent_availability_blocks')
      .select('capacity_pct')
      .eq('tenant_id', tenantId)
      .eq('block_type', 'available')
      .lte('starts_at', endsAt)
      .gte('ends_at', startsAt)

    this.throwIfError(error)
    return (data ?? []).reduce((sum, row) => sum + Number(row.capacity_pct ?? 0), 0)
  }
}
