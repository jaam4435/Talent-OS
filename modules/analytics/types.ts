/** Analytics module types. */

export const ANALYTICS_DASHBOARDS = [
  'organizations',
  'projects',
  'talent',
  'utilization',
  'revenue',
  'delivery',
  'ai_usage',
  'workflows',
  'summary',
] as const

export type AnalyticsDashboard = (typeof ANALYTICS_DASHBOARDS)[number]

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'ytd' | 'custom'

export interface ChartDataPoint {
  label?: string
  x?: string
  y: number
  value?: number
}

export interface AnalyticsCharts {
  [key: string]: ChartDataPoint[]
}

export interface AnalyticsDashboardPayload {
  summary: Record<string, number | string | null>
  charts: AnalyticsCharts
  cachedAt?: string
  cacheTtlMs?: number
}

export interface AnalyticsModuleSummary {
  organizations: Record<string, unknown>
  projects: Record<string, unknown>
  talent: Record<string, unknown>
  utilization: Record<string, unknown>
  revenue: Record<string, unknown>
  delivery: Record<string, unknown>
  ai_usage: Record<string, unknown>
  workflows: Record<string, unknown>
  legacy: Record<string, unknown> | null
}

export interface AnalyticsExportRecord {
  id: string
  tenantId: string
  requestedBy: string
  dashboard: AnalyticsDashboard
  format: 'csv' | 'json'
  status: 'pending' | 'completed' | 'failed' | 'expired'
  rowCount: number
  content: string | null
  filters: Record<string, unknown>
  errorMessage: string | null
  createdAt: string
  expiresAt: string
}

export const ANALYTICS_CACHE_TTL = {
  summary: 60_000,
  organizations: 120_000,
  projects: 120_000,
  talent: 120_000,
  utilization: 180_000,
  revenue: 180_000,
  delivery: 120_000,
  ai_usage: 120_000,
  workflows: 120_000,
} as const
