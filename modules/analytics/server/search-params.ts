import type { AnalyticsPeriod } from '@/modules/analytics/types'

export function parseAnalyticsSearchParams(
  params: Record<string, string | string[] | undefined>
) {
  return {
    period: (typeof params.period === 'string' ? params.period : '30d') as AnalyticsPeriod | string,
    from: typeof params.from === 'string' ? params.from : undefined,
    to: typeof params.to === 'string' ? params.to : undefined,
    refresh: params.refresh === 'true',
  }
}
