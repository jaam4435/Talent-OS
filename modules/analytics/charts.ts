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

export type RechartsSeriesPoint = {
  name: string
  value: number
}

/** Map chart data points to Recharts-friendly rows. */
export function toRechartsSeries(points: ChartDataPoint[]): RechartsSeriesPoint[] {
  return points.map((point) => ({
    name: point.label ?? point.x ?? 'Unknown',
    value: point.y,
  }))
}

/** Infer chart type from series key naming conventions. */
export function inferChartType(seriesKey: string): 'pie' | 'bar' | 'line' {
  const key = seriesKey.toLowerCase()
  if (key.includes('over_time') || key.includes('timeline') || key.includes('trend')) {
    return 'line'
  }
  if (key.includes('distribution') || key.includes('share') || key.includes('mix')) {
    return 'pie'
  }
  if (key.startsWith('by_') || key.includes('breakdown')) {
    return 'bar'
  }
  return 'bar'
}

/** Human-readable label for summary metric keys. */
export function formatSummaryLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

/** Format summary values for KPI cards. */
export function formatSummaryValue(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(1)
  }
  return String(value)
}
