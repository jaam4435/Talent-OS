import type { Repositories } from '@/lib/repositories/factory'
import type { PaginatedResult } from '@/lib/repositories/base/types'
import type { AnalyticsService } from '@/lib/services/analytics.service'
import {
  ANALYTICS_CACHE_TTL,
  type AnalyticsDashboard,
  type AnalyticsDashboardPayload,
  type AnalyticsExportRecord,
  type AnalyticsModuleSummary,
} from '@/modules/analytics/types'
import { dashboardToCsv, dashboardToJson } from '@/modules/analytics/charts'
import { resolveDateRange } from '@/modules/analytics/validation'

export class AnalyticsModuleService {
  constructor(
    private readonly repos: Repositories,
    private readonly analytics: AnalyticsService
  ) {}

  async getSummary(tenantId: string, refresh = false): Promise<AnalyticsModuleSummary> {
    if (refresh) {
      await this.repos.analyticsModule.invalidateTenantCache(tenantId)
    }
    return this.repos.analyticsModule.getModuleSummary(tenantId, ANALYTICS_CACHE_TTL.summary)
  }

  /** Legacy dashboard — backward compatible with existing API. */
  async getLegacyDashboard(tenantId: string) {
    return this.analytics.getDashboardSummary(tenantId)
  }

  async getOrganizations(tenantId: string, refresh = false): Promise<AnalyticsDashboardPayload> {
    if (refresh) await this.repos.analyticsModule.invalidateTenantCache(tenantId)
    return this.repos.analyticsModule.getOrganizations(tenantId, ANALYTICS_CACHE_TTL.organizations)
  }

  async getProjects(
    tenantId: string,
    input: { period?: string; from?: string; to?: string; refresh?: boolean }
  ): Promise<AnalyticsDashboardPayload> {
    if (input.refresh) await this.repos.analyticsModule.invalidateTenantCache(tenantId)
    const range = resolveDateRange(input)
    return this.repos.analyticsModule.getProjects(tenantId, range, ANALYTICS_CACHE_TTL.projects)
  }

  async getTalent(tenantId: string, refresh = false): Promise<AnalyticsDashboardPayload> {
    if (refresh) await this.repos.analyticsModule.invalidateTenantCache(tenantId)
    return this.repos.analyticsModule.getTalent(tenantId, ANALYTICS_CACHE_TTL.talent)
  }

  async getUtilization(
    tenantId: string,
    input: { period?: string; from?: string; to?: string; refresh?: boolean }
  ): Promise<AnalyticsDashboardPayload> {
    if (input.refresh) await this.repos.analyticsModule.invalidateTenantCache(tenantId)
    const range = resolveDateRange(input)
    return this.repos.analyticsModule.getUtilization(tenantId, range, ANALYTICS_CACHE_TTL.utilization)
  }

  async getRevenue(
    tenantId: string,
    input: { period?: string; from?: string; to?: string; refresh?: boolean }
  ): Promise<AnalyticsDashboardPayload> {
    if (input.refresh) await this.repos.analyticsModule.invalidateTenantCache(tenantId)
    const range = resolveDateRange(input)
    return this.repos.analyticsModule.getRevenue(tenantId, range, ANALYTICS_CACHE_TTL.revenue)
  }

  async getDelivery(
    tenantId: string,
    input: { period?: string; from?: string; to?: string; refresh?: boolean }
  ): Promise<AnalyticsDashboardPayload> {
    if (input.refresh) await this.repos.analyticsModule.invalidateTenantCache(tenantId)
    const range = resolveDateRange(input)
    return this.repos.analyticsModule.getDelivery(tenantId, range, ANALYTICS_CACHE_TTL.delivery)
  }

  async getAiUsage(
    tenantId: string,
    input: { period?: string; from?: string; to?: string; refresh?: boolean }
  ): Promise<AnalyticsDashboardPayload> {
    if (input.refresh) await this.repos.analyticsModule.invalidateTenantCache(tenantId)
    const range = resolveDateRange(input)
    return this.repos.analyticsModule.getAiUsage(tenantId, range, ANALYTICS_CACHE_TTL.ai_usage)
  }

  async getWorkflowPerformance(
    tenantId: string,
    input: { period?: string; from?: string; to?: string; refresh?: boolean }
  ): Promise<AnalyticsDashboardPayload> {
    if (input.refresh) await this.repos.analyticsModule.invalidateTenantCache(tenantId)
    const range = resolveDateRange(input)
    return this.repos.analyticsModule.getWorkflowPerformance(tenantId, range, ANALYTICS_CACHE_TTL.workflows)
  }

  async getDashboard(
    tenantId: string,
    dashboard: AnalyticsDashboard,
    input: { period?: string; from?: string; to?: string; refresh?: boolean } = {}
  ): Promise<AnalyticsDashboardPayload | AnalyticsModuleSummary> {
    switch (dashboard) {
      case 'organizations':
        return this.getOrganizations(tenantId, input.refresh)
      case 'projects':
        return this.getProjects(tenantId, input)
      case 'talent':
        return this.getTalent(tenantId, input.refresh)
      case 'utilization':
        return this.getUtilization(tenantId, input)
      case 'revenue':
        return this.getRevenue(tenantId, input)
      case 'delivery':
        return this.getDelivery(tenantId, input)
      case 'ai_usage':
        return this.getAiUsage(tenantId, input)
      case 'workflows':
        return this.getWorkflowPerformance(tenantId, input)
      case 'summary':
        return this.getSummary(tenantId, input.refresh)
      default:
        return this.getSummary(tenantId, input.refresh)
    }
  }

  async createExport(
    tenantId: string,
    userId: string,
    input: {
      dashboard: AnalyticsDashboard
      format?: 'csv' | 'json'
      period?: string
      from?: string
      to?: string
    }
  ): Promise<AnalyticsExportRecord> {
    const dashboard = input.dashboard === 'summary' ? 'organizations' : input.dashboard
    const payload = (await this.getDashboard(tenantId, dashboard, input)) as AnalyticsDashboardPayload

    const format = input.format ?? 'csv'
    const content =
      format === 'json'
        ? dashboardToJson(payload as unknown as Record<string, unknown>)
        : dashboardToCsv(payload)

    const rowCount =
      Object.keys(payload.summary ?? {}).length +
      Object.values(payload.charts ?? {}).reduce((sum, series) => sum + series.length, 0)

    return this.repos.analyticsExport.create({
      tenant_id: tenantId,
      requested_by: userId,
      dashboard: input.dashboard,
      format,
      content,
      row_count: rowCount,
      filters: { period: input.period, from: input.from, to: input.to },
    })
  }

  async getExport(tenantId: string, exportId: string): Promise<AnalyticsExportRecord | null> {
    return this.repos.analyticsExport.findById(exportId, tenantId)
  }

  async listExports(
    tenantId: string,
    options: { page?: number; limit?: number }
  ): Promise<PaginatedResult<AnalyticsExportRecord>> {
    return this.repos.analyticsExport.list(tenantId, options)
  }

  /** Pre-warm analytics_cache_snapshots for all tenants (cron). */
  async refreshAllSnapshots(ttlMinutes = 15): Promise<{
    tenants: number
    refreshed: number
    errors: string[]
  }> {
    const tenantIds = await this.repos.observability.listActiveTenantIds()
    let refreshed = 0
    const errors: string[] = []

    for (const tenantId of tenantIds) {
      try {
        const result = await this.repos.analyticsModule.refreshTenantSnapshots(tenantId, ttlMinutes)
        refreshed += result.snapshotsRefreshed
        await this.repos.analyticsModule.invalidateTenantCache(tenantId)
      } catch (error) {
        errors.push(
          `${tenantId}: ${error instanceof Error ? error.message : 'refresh failed'}`
        )
      }
    }

    return { tenants: tenantIds.length, refreshed, errors }
  }
}
