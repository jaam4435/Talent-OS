import type { AnalyticsCharts, ChartDataPoint } from './types'

/** Normalize RPC chart arrays into typed chart data points. */
export function normalizeCharts(raw: Record<string, unknown> | undefined): AnalyticsCharts {
  if (!raw || typeof raw !== 'object') return {}

  const charts: AnalyticsCharts = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) continue
    charts[key] = value.map((item) => normalizePoint(item))
  }
  return charts
}

function normalizePoint(item: unknown): ChartDataPoint {
  if (!item || typeof item !== 'object') return { y: 0 }
  const row = item as Record<string, unknown>
  const y = Number(row.y ?? row.value ?? 0)
  return {
    label: row.label as string | undefined,
    x: row.x as string | undefined,
    y,
    value: y,
  }
}

/** Convert chart series to CSV rows. */
export function chartSeriesToCsv(charts: AnalyticsCharts): string {
  const lines: string[] = ['chart,label,x,y']

  for (const [chartName, points] of Object.entries(charts)) {
    for (const point of points) {
      const label = point.label ?? ''
      const x = point.x ?? ''
      lines.push(`${csvEscape(chartName)},${csvEscape(label)},${csvEscape(x)},${point.y}`)
    }
  }

  return lines.join('\n')
}

/** Flatten summary + charts into exportable CSV. */
export function dashboardToCsv(payload: {
  summary: Record<string, unknown>
  charts: AnalyticsCharts
}): string {
  const summaryLines = ['metric,value']
  for (const [key, value] of Object.entries(payload.summary)) {
    summaryLines.push(`${csvEscape(key)},${csvEscape(String(value ?? ''))}`)
  }

  return `${summaryLines.join('\n')}\n\n${chartSeriesToCsv(payload.charts)}`
}

/** Convert dashboard payload to JSON export string. */
export function dashboardToJson(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2)
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Build pie/bar chart metadata for frontend renderers. */
export function chartMeta(type: 'pie' | 'bar' | 'line', seriesKey: string) {
  return { type, seriesKey }
}
