'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { analyticsApi, downloadExportContent } from '@/lib/api/analytics-api'
import { getUserMessageForApiError } from '@/lib/api/user-messages'
import type { AnalyticsDashboard } from '@/modules/analytics/types'

export function useAnalyticsDashboard() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const run = useCallback(
    (action: () => Promise<void>) => {
      setError(null)
      startTransition(async () => {
        try {
          await action()
        } catch (err) {
          setError(getUserMessageForApiError(err))
        }
      })
    },
    []
  )

  const refresh = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('refresh', 'true')
    router.push(`${window.location.pathname}?${params.toString()}`)
    router.refresh()
  }, [router])

  const exportDashboard = useCallback(
    (
      dashboard: AnalyticsDashboard,
      options?: { format?: 'csv' | 'json'; period?: string; from?: string; to?: string }
    ) => {
      run(async () => {
        const record = await analyticsApi.createExport({
          dashboard,
          format: options?.format ?? 'csv',
          period: options?.period,
          from: options?.from,
          to: options?.to,
        })
        downloadExportContent(record)
      })
    },
    [run]
  )

  return {
    error,
    isPending,
    clearError: () => setError(null),
    run,
    refresh,
    exportDashboard,
    api: analyticsApi,
  }
}
