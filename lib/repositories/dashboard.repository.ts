import { BaseRepository } from '@/lib/repositories/base/base.repository'

export interface DashboardSummary {
  total_freelancers?: number
  active_projects?: number
  open_opportunities?: number
  pending_payments?: number
}

export class DashboardRepository extends BaseRepository {
  async getSummary(tenantId: string): Promise<DashboardSummary | null> {
    const cacheKey = this.cacheKey('v_dashboard_summary', { tenantId })
    return this.withCache(cacheKey, 60_000, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_dashboard_summary', {
        p_tenant_id: tenantId,
      })
      this.throwIfError(error)
      const row = Array.isArray(data) ? data[0] : data
      return (row as DashboardSummary | null) ?? null
    })
  }
}

export class MatchScoreRepository extends BaseRepository {
  async findByOpportunity(opportunityId: string): Promise<Array<{ freelancer_id: string; score: number }>> {
    const { data } = await this.ctx.supabase
      .from('talent_match_scores')
      .select('freelancer_id, score')
      .eq('opportunity_id', opportunityId)
    return (data ?? []).map((s) => ({ freelancer_id: s.freelancer_id, score: Number(s.score) }))
  }

  async listDetailedByOpportunity(opportunityId: string, tenantId: string) {
    const { data } = await this.ctx.supabase
      .from('talent_match_scores')
      .select(
        'id, opportunity_id, freelancer_id, ai_request_id, score, rationale, skill_overlap, rank, created_at'
      )
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', tenantId)
      .order('score', { ascending: false })
    return data ?? []
  }

  async listTopScoresByOpportunity(opportunityId: string, limit = 10) {
    const { data } = await this.ctx.supabase
      .from('talent_match_scores')
      .select('freelancer_id, score, rationale, skill_overlap')
      .eq('opportunity_id', opportunityId)
      .order('score', { ascending: false })
      .limit(limit)
    return data ?? []
  }

  async listByFreelancer(freelancerId: string, tenantId: string, limit = 10) {
    const { data } = await this.ctx.supabase
      .from('talent_match_scores')
      .select(
        'id, opportunity_id, score, rationale, skill_overlap, rank, created_at, opportunities(title, status)'
      )
      .eq('freelancer_id', freelancerId)
      .eq('tenant_id', tenantId)
      .order('score', { ascending: false })
      .limit(limit)
    return data ?? []
  }

  async upsertScores(
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
  ): Promise<void> {
    if (!rows.length) return
    const { error } = await this.ctx.supabase.from('talent_match_scores').upsert(rows, {
      onConflict: 'opportunity_id,freelancer_id',
    })
    this.throwIfError(error)
  }
}

export class TenantMemberRepository extends BaseRepository {
  async findCompanyId(userId: string, tenantId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('tenant_members')
      .select('company_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    return data?.company_id ?? null
  }

  async listWithProfiles(tenantId: string) {
    const { data, error } = await this.ctx.supabase
      .from('tenant_members')
      .select(
        `
        id,
        role,
        status,
        joined_at,
        profiles (
          id,
          email,
          full_name
        )
      `
      )
      .eq('tenant_id', tenantId)
      .order('joined_at', { ascending: true })

    this.throwIfError(error)
    return data ?? []
  }
}

export class MemberInviteRepository extends BaseRepository {
  async listPending(tenantId: string) {
    const { data, error } = await this.ctx.supabase
      .from('member_invites')
      .select('id, email, role, expires_at, created_at, accepted_at, revoked_at')
      .eq('tenant_id', tenantId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })

    this.throwIfError(error)
    return data ?? []
  }
}
