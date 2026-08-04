import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { AnalyticsDashboardPayload, AnalyticsExportRecord, AnalyticsModuleSummary } from '@/modules/analytics/types'
import { normalizeCharts } from '@/modules/analytics/charts'

export class AnalyticsModuleRepository extends BaseRepository {
  async getOrganizations(tenantId: string, ttlMs: number): Promise<AnalyticsDashboardPayload> {
    return this.fetchDashboard(tenantId, 'organizations', ttlMs, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_analytics_organizations', {
        p_tenant_id: tenantId,
      })
      this.throwIfError(error)
      return this.parsePayload(data)
    })
  }

  async getProjects(
    tenantId: string,
    range: { from?: string; to?: string },
    ttlMs: number
  ): Promise<AnalyticsDashboardPayload> {
    return this.fetchDashboard(tenantId, 'projects', ttlMs, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_analytics_projects', {
        p_tenant_id: tenantId,
        p_from: range.from ?? null,
        p_to: range.to ?? null,
      })
      this.throwIfError(error)
      return this.parsePayload(data)
    }, range)
  }

  async getTalent(tenantId: string, ttlMs: number): Promise<AnalyticsDashboardPayload> {
    return this.fetchDashboard(tenantId, 'talent', ttlMs, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_analytics_talent', {
        p_tenant_id: tenantId,
      })
      this.throwIfError(error)
      return this.parsePayload(data)
    })
  }

  async getUtilization(
    tenantId: string,
    range: { from?: string; to?: string },
    ttlMs: number
  ): Promise<AnalyticsDashboardPayload> {
    return this.fetchDashboard(tenantId, 'utilization', ttlMs, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_analytics_utilization', {
        p_tenant_id: tenantId,
        p_from: range.from ?? null,
        p_to: range.to ?? null,
      })
      this.throwIfError(error)
      return this.parsePayload(data)
    }, range)
  }

  async getRevenue(
    tenantId: string,
    range: { from?: string; to?: string },
    ttlMs: number
  ): Promise<AnalyticsDashboardPayload> {
    return this.fetchDashboard(tenantId, 'revenue', ttlMs, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_analytics_revenue', {
        p_tenant_id: tenantId,
        p_from: range.from ?? null,
        p_to: range.to ?? null,
      })
      this.throwIfError(error)
      return this.parsePayload(data)
    }, range)
  }

  async getDelivery(
    tenantId: string,
    range: { from?: string; to?: string },
    ttlMs: number
  ): Promise<AnalyticsDashboardPayload> {
    return this.fetchDashboard(tenantId, 'delivery', ttlMs, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_analytics_delivery', {
        p_tenant_id: tenantId,
        p_from: range.from ?? null,
        p_to: range.to ?? null,
      })
      this.throwIfError(error)
      return this.parsePayload(data)
    }, range)
  }

  async getAiUsage(
    tenantId: string,
    range: { from?: string; to?: string },
    ttlMs: number
  ): Promise<AnalyticsDashboardPayload> {
    return this.fetchDashboard(tenantId, 'ai_usage', ttlMs, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_analytics_ai_usage', {
        p_tenant_id: tenantId,
        p_from: range.from ?? null,
        p_to: range.to ?? null,
      })
      this.throwIfError(error)
      return this.parsePayload(data)
    }, range)
  }

  async getWorkflowPerformance(
    tenantId: string,
    range: { from?: string; to?: string },
    ttlMs: number
  ): Promise<AnalyticsDashboardPayload> {
    return this.fetchDashboard(tenantId, 'workflows', ttlMs, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_analytics_workflow_performance', {
        p_tenant_id: tenantId,
        p_from: range.from ?? null,
        p_to: range.to ?? null,
      })
      this.throwIfError(error)
      return this.parsePayload(data)
    }, range)
  }

  async getModuleSummary(tenantId: string, ttlMs: number): Promise<AnalyticsModuleSummary> {
    const cacheKey = this.cacheKey('analytics_summary', { tenantId })
    return this.withCache(cacheKey, ttlMs, async () => {
      const { data, error } = await this.ctx.supabase.rpc('get_analytics_module_summary', {
        p_tenant_id: tenantId,
      })
      this.throwIfError(error)
      const row = data as AnalyticsModuleSummary | null
      return row ?? {
        organizations: {},
        projects: {},
        talent: {},
        utilization: {},
        revenue: {},
        delivery: {},
        ai_usage: {},
        workflows: {},
        legacy: null,
      }
    })
  }

  async invalidateTenantCache(tenantId: string): Promise<void> {
    this.invalidateTable(`analytics:${tenantId}`)
  }

  private async fetchDashboard(
    tenantId: string,
    dashboard: string,
    ttlMs: number,
    fn: () => Promise<AnalyticsDashboardPayload>,
    range?: { from?: string; to?: string }
  ): Promise<AnalyticsDashboardPayload> {
    const cacheKey = this.cacheKey(`analytics:${tenantId}:${dashboard}`, range ?? {})
    const payload = await this.withCache(cacheKey, ttlMs, fn)
    return {
      ...payload,
      cachedAt: new Date().toISOString(),
      cacheTtlMs: ttlMs,
    }
  }

  private parsePayload(data: unknown): AnalyticsDashboardPayload {
    const row = (data ?? {}) as Record<string, unknown>
    return {
      summary: (row.summary as Record<string, number | string | null>) ?? {},
      charts: normalizeCharts(row.charts as Record<string, unknown>),
    }
  }
}

export class AnalyticsExportRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    requested_by: string
    dashboard: string
    format: 'csv' | 'json'
    content: string
    row_count: number
    filters?: Record<string, unknown>
  }): Promise<AnalyticsExportRecord> {
    const { data, error } = await this.ctx.supabase
      .from('analytics_exports')
      .insert({
        tenant_id: input.tenant_id,
        requested_by: input.requested_by,
        dashboard: input.dashboard,
        format: input.format,
        content: input.content,
        row_count: input.row_count,
        filters: (input.filters ?? {}) as Json,
        status: 'completed',
      })
      .select('*')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('Analytics export')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<AnalyticsExportRecord | null> {
    const { data } = await this.ctx.supabase
      .from('analytics_exports')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    return data ? this.mapRow(data) : null
  }

  async list(
    tenantId: string,
    options: { page?: number; limit?: number }
  ): Promise<PaginatedResult<AnalyticsExportRecord>> {
    const { limit, offset, page } = this.paginate(options)

    const { data, error, count } = await this.ctx.supabase
      .from('analytics_exports')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)

    return toPaginatedResult(
      (data ?? []).map((row) => this.mapRow(row)),
      { limit, page },
      count ?? undefined
    )
  }

  private mapRow(row: {
    id: string
    tenant_id: string
    requested_by: string
    dashboard: string
    format: string
    status: string
    row_count: number
    content: string | null
    filters: Json
    error_message: string | null
    created_at: string
    expires_at: string
  }): AnalyticsExportRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      requestedBy: row.requested_by,
      dashboard: row.dashboard as AnalyticsExportRecord['dashboard'],
      format: row.format as AnalyticsExportRecord['format'],
      status: row.status as AnalyticsExportRecord['status'],
      rowCount: row.row_count,
      content: row.content,
      filters: (row.filters as Record<string, unknown>) ?? {},
      errorMessage: row.error_message,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }
  }
}
