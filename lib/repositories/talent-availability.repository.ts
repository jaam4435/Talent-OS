import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { TalentAvailabilitySlot, TalentSlotStatus } from '@/modules/talent/types'

export class TalentAvailabilityRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    freelancer_id: string
    starts_at: string
    ends_at: string
    status?: TalentSlotStatus
    notes?: string | null
  }): Promise<TalentAvailabilitySlot> {
    const { data, error } = await this.ctx.supabase
      .from('talent_availability_slots')
      .insert(input)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Availability slot')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<TalentAvailabilitySlot | null> {
    const { data, error } = await this.ctx.supabase
      .from('talent_availability_slots')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async listByFreelancer(
    freelancerId: string,
    tenantId: string,
    range?: { from: string; to: string }
  ): Promise<TalentAvailabilitySlot[]> {
    let query = this.ctx.supabase
      .from('talent_availability_slots')
      .select('*')
      .eq('freelancer_id', freelancerId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('starts_at', { ascending: true })

    if (range) {
      query = query.gte('starts_at', range.from).lte('ends_at', range.to)
    }

    const { data, error } = await query
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<TalentAvailabilitySlot> {
    const { data, error } = await this.ctx.supabase
      .from('talent_availability_slots')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Availability slot')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('talent_availability_slots')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): TalentAvailabilitySlot {
    return {
      id: row.id as string,
      freelancerId: row.freelancer_id as string,
      startsAt: row.starts_at as string,
      endsAt: row.ends_at as string,
      status: row.status as TalentSlotStatus,
      notes: (row.notes as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
