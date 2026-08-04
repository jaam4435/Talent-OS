'use client'

import type { AnalyticsDashboard, AnalyticsPeriod } from '@/modules/analytics/types'
import { Button } from '@/modules/core/components/ui/button'
import { Label } from '@/modules/core/components/ui/label'
import { useAnalyticsDashboard } from '@/modules/analytics/hooks/use-analytics-dashboard'
import { formatRelative } from '@/modules/core/utils/format'

interface ExportButtonProps {
  dashboard: AnalyticsDashboard
  period?: AnalyticsPeriod | string
  from?: string
  to?: string
}

export function ExportButton({ dashboard, period, from, to }: ExportButtonProps) {
  const { exportDashboard, isPending, error } = useAnalyticsDashboard()

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => exportDashboard(dashboard, { format: 'csv', period, from, to })}
        >
          Export CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => exportDashboard(dashboard, { format: 'json', period, from, to })}
        >
          Export JSON
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

interface DashboardShellProps {
  title: string
  description?: string
  dashboard: AnalyticsDashboard
  cachedAt?: string
  cacheTtlMs?: number
  period?: string
  from?: string
  to?: string
  children: React.ReactNode
}

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom range' },
]

export function DashboardShell({
  title,
  description,
  dashboard,
  cachedAt,
  cacheTtlMs,
  period = '30d',
  from,
  to,
  children,
}: DashboardShellProps) {
  const { refresh, isPending } = useAnalyticsDashboard()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {cachedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Cached {formatRelative(cachedAt)}
              {cacheTtlMs ? ` · TTL ${Math.round(cacheTtlMs / 1000)}s` : ''}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <DashboardPeriodControls period={period} from={from} to={to} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={refresh}>
              Refresh data
            </Button>
            <ExportButton dashboard={dashboard} period={period} from={from} to={to} />
          </div>
        </div>
      </div>

      {children}
    </div>
  )
}

function DashboardPeriodControls({
  period,
  from,
  to,
}: {
  period: string
  from?: string
  to?: string
}) {
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const formData = new FormData(form)
        const nextPeriod = String(formData.get('period') ?? '30d')
        const params = new URLSearchParams(window.location.search)
        params.set('period', nextPeriod)
        params.delete('refresh')

        if (nextPeriod === 'custom') {
          const nextFrom = String(formData.get('from') ?? '')
          const nextTo = String(formData.get('to') ?? '')
          if (nextFrom) params.set('from', new Date(nextFrom).toISOString())
          else params.delete('from')
          if (nextTo) params.set('to', new Date(nextTo).toISOString())
          else params.delete('to')
        } else {
          params.delete('from')
          params.delete('to')
        }

        window.location.search = params.toString()
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="period">Period</Label>
        <select
          id="period"
          name="period"
          defaultValue={period}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {period === 'custom' ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <input
              id="from"
              name="from"
              type="datetime-local"
              defaultValue={from ? toDateTimeLocal(from) : ''}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <input
              id="to"
              name="to"
              type="datetime-local"
              defaultValue={to ? toDateTimeLocal(to) : ''}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </>
      ) : null}
      <Button type="submit" size="sm">
        Apply
      </Button>
    </form>
  )
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}
