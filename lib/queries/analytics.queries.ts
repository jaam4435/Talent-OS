import { createServices } from '@/lib/services/factory'
import type { AnalyticsDashboard, AnalyticsPeriod } from '@/modules/analytics/types'

export interface AnalyticsQueryOptions {
  period?: AnalyticsPeriod | string
  from?: string
  to?: string
  refresh?: boolean
}

export async function getAnalyticsSummary(tenantId: string, refresh = false) {
  const services = await createServices()
  return services.analyticsModule.getSummary(tenantId, refresh)
}

export async function getAnalyticsOrganizations(tenantId: string, refresh = false) {
  const services = await createServices()
  return services.analyticsModule.getOrganizations(tenantId, refresh)
}

export async function getAnalyticsProjects(tenantId: string, options: AnalyticsQueryOptions = {}) {
  const services = await createServices()
  return services.analyticsModule.getProjects(tenantId, options)
}

export async function getAnalyticsTalent(tenantId: string, refresh = false) {
  const services = await createServices()
  return services.analyticsModule.getTalent(tenantId, refresh)
}

export async function getAnalyticsUtilization(tenantId: string, options: AnalyticsQueryOptions = {}) {
  const services = await createServices()
  return services.analyticsModule.getUtilization(tenantId, options)
}

export async function getAnalyticsRevenue(tenantId: string, options: AnalyticsQueryOptions = {}) {
  const services = await createServices()
  return services.analyticsModule.getRevenue(tenantId, options)
}

export async function getAnalyticsDelivery(tenantId: string, options: AnalyticsQueryOptions = {}) {
  const services = await createServices()
  return services.analyticsModule.getDelivery(tenantId, options)
}

export async function getAnalyticsAiUsage(tenantId: string, options: AnalyticsQueryOptions = {}) {
  const services = await createServices()
  return services.analyticsModule.getAiUsage(tenantId, options)
}

export async function getAnalyticsWorkflows(tenantId: string, options: AnalyticsQueryOptions = {}) {
  const services = await createServices()
  return services.analyticsModule.getWorkflowPerformance(tenantId, options)
}

export async function getAnalyticsDashboard(
  tenantId: string,
  dashboard: AnalyticsDashboard,
  options: AnalyticsQueryOptions = {}
) {
  const services = await createServices()
  return services.analyticsModule.getDashboard(tenantId, dashboard, options)
}

export async function listAnalyticsExports(tenantId: string, options?: { page?: number; limit?: number }) {
  const services = await createServices()
  return services.analyticsModule.listExports(tenantId, options ?? {})
}
