import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import type { AnalyticsDashboard, AnalyticsExportRecord } from '@/modules/analytics/types'

async function analyticsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': 'v1',
      ...(init?.headers ?? {}),
    },
  })

  const json = (await response.json()) as ApiResponse<T> | ApiErrorBody
  if (!response.ok || 'error' in json) {
    const err = json as ApiErrorBody
    throw new TalentOsApiError(
      err.error?.code ?? 'INTERNAL_ERROR',
      err.error?.message ?? 'Request failed',
      response.status,
      err.error?.details
    )
  }

  return (json as ApiSuccess<T>).data
}

export const analyticsApi = {
  createExport(body: {
    dashboard: AnalyticsDashboard
    format?: 'csv' | 'json'
    period?: string
    from?: string
    to?: string
  }) {
    return analyticsRequest<AnalyticsExportRecord>('/api/analytics/exports', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  getExport(id: string) {
    return analyticsRequest<AnalyticsExportRecord>(`/api/analytics/exports/${id}`)
  },
}

export function downloadExportContent(record: AnalyticsExportRecord) {
  const mimeType = record.format === 'json' ? 'application/json' : 'text/csv'
  const blob = new Blob([record.content ?? ''], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `analytics-${record.dashboard}.${record.format}`
  anchor.click()
  URL.revokeObjectURL(url)
}
