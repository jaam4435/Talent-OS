import { z } from 'zod'
import { ANALYTICS_DASHBOARDS } from './types'

export const periodSchema = z.enum(['7d', '30d', '90d', 'ytd', 'custom']).default('30d')

export const dateRangeQuerySchema = z.object({
  period: periodSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export const dashboardQuerySchema = dateRangeQuerySchema.extend({
  refresh: z.coerce.boolean().optional(),
})

export const exportSchema = z.object({
  dashboard: z.enum(ANALYTICS_DASHBOARDS as unknown as [string, ...string[]]),
  format: z.enum(['csv', 'json']).default('csv'),
  period: periodSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export const exportListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export function resolveDateRange(input: {
  period?: string
  from?: string
  to?: string
}): { from?: string; to?: string } {
  if (input.from || input.to) {
    return { from: input.from, to: input.to ?? new Date().toISOString() }
  }

  const now = new Date()
  let from: Date

  switch (input.period ?? '30d') {
    case '7d':
      from = new Date(now.getTime() - 7 * 86400000)
      break
    case '90d':
      from = new Date(now.getTime() - 90 * 86400000)
      break
    case 'ytd':
      from = new Date(now.getFullYear(), 0, 1)
      break
    case '30d':
    default:
      from = new Date(now.getTime() - 30 * 86400000)
  }

  return { from: from.toISOString(), to: now.toISOString() }
}
