import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { AssignmentAllocation, AssignmentStatus } from '@/modules/assignment/types'

export class AssignmentAllocationRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    freelancer_id: string
    project_id?: string | null
    opportunity_id?: string | null
    title: string
    status?: AssignmentStatus
    allocation_pct?: number
    starts_at: string
    ends_at: string
    notes?: string | null
    created_by?: string | null
  }): Promise<AssignmentAllocation> {
    const { data, error } = await this.ctx.supabase.from('assignment_allocations').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Allocation')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<AssignmentAllocation | null> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_allocations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async list(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      status?: string
      freelancerId?: string
      projectId?: string
      opportunityId?: string
      from?: string
      to?: string
    }
  ): Promise<PaginatedResult<AssignmentAllocation>> {
    const { limit, offset, page } = this.paginate(options)
    let query = this.ctx.supabase
      .from('assignment_allocations')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('starts_at', { ascending: false })

    if (options.status) query = query.eq('status', options.status as AssignmentStatus)
    if (options.freelancerId) query = query.eq('freelancer_id', options.freelancerId)
    if (options.projectId) query = query.eq('project_id', options.projectId)
    if (options.opportunityId) query = query.eq('opportunity_id', options.opportunityId)
    if (options.from) query = query.gte('ends_at', options.from)
    if (options.to) query = query.lte('starts_at', options.to)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((r) => this.mapRow(r)), { limit, page }, count ?? undefined)
  }

  async update(id: string, tenantId: string, patch: Record<string, unknown>): Promise<AssignmentAllocation> {
    const { data, error } = await this.ctx.supabase
      .from('assignment_allocations')
      .update(patch as never)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Allocation')
    return this.mapRow(data)
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('assignment_allocations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  async detectConflicts(
    tenantId: string,
    freelancerId: string,
    startsAt: string,
    endsAt: string,
    allocationPct = 100,
    excludeId?: string
  ) {
    const { data, error } = await this.ctx.supabase.rpc('detect_assignment_conflicts', {
      p_tenant_id: tenantId,
      p_freelancer_id: freelancerId,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_allocation_pct: allocationPct,
      p_exclude_allocation_id: excludeId ?? null,
    })
    this.throwIfError(error)
    return data ?? []
  }

  async suggestCandidates(
    tenantId: string,
    skills: string[],
    startsAt?: string,
    endsAt?: string,
    limit = 10
  ) {
    const { data, error } = await this.ctx.supabase.rpc('suggest_assignment_candidates', {
      p_tenant_id: tenantId,
      p_required_skills: skills,
      p_starts_at: startsAt ?? null,
      p_ends_at: endsAt ?? null,
      p_limit: limit,
    })
    this.throwIfError(error)
    return data ?? []
  }

  private mapRow(row: Record<string, unknown>): AssignmentAllocation {
    return {
      id: row.id as string,
      freelancerId: row.freelancer_id as string,
      projectId: (row.project_id as string | null) ?? null,
      opportunityId: (row.opportunity_id as string | null) ?? null,
      title: row.title as string,
      status: row.status as AssignmentStatus,
      allocationPct: row.allocation_pct as number,
      startsAt: row.starts_at as string,
      endsAt: row.ends_at as string,
      notes: (row.notes as string | null) ?? null,
      createdBy: (row.created_by as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
