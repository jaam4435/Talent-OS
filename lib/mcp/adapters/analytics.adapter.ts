import type { AnalyticsToolInputs } from '@/lib/mcp/servers/analytics.server'
import { mcpOk, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const ANALYTICS_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  analytics_dashboard_summary: async (input, ctx) => {
    const data = asInput<AnalyticsToolInputs['analytics_dashboard_summary']>(input)
    const summary = await ctx.services.analytics.getDashboardSummary(ctx.execution.tenantId)
    return mcpOk({ period: data.period ?? '30d', summary })
  },

  analytics_fill_rate: async (input, ctx) => {
    const data = asInput<AnalyticsToolInputs['analytics_fill_rate']>(input)
    const report = await ctx.services.analytics.getFillRate(ctx.execution.tenantId, {
      fromDate: data.from_date,
      toDate: data.to_date,
      discipline: data.discipline,
    })
    return mcpOk(report)
  },

  analytics_talent_utilization: async (input, ctx) => {
    const data = asInput<AnalyticsToolInputs['analytics_talent_utilization']>(input)
    const report = await ctx.services.analytics.getTalentUtilization(ctx.execution.tenantId, {
      discipline: data.discipline,
      minAssignments: data.min_assignments,
    })
    return mcpOk(report)
  },

  analytics_payment_aging: async (_input, ctx) => {
    const report = await ctx.services.analytics.getPaymentAgingAnalytics(ctx.execution.tenantId)
    return mcpOk(report)
  },

  analytics_ai_usage: async (input, ctx) => {
    const data = asInput<AnalyticsToolInputs['analytics_ai_usage']>(input)
    const report = await ctx.services.analytics.getAiUsage(ctx.execution.tenantId, {
      fromDate: data.from_date,
      toDate: data.to_date,
      feature: data.feature,
    })
    return mcpOk(report)
  },

  analytics_pipeline_health: async (_input, ctx) => {
    const report = await ctx.services.analytics.getPipelineHealth(ctx.execution.tenantId)
    return mcpOk(report)
  },
}
