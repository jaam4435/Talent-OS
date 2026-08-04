'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import type { ObservabilityDashboard } from '@/lib/observability/types'

import type { AlertSummary, ObservabilityDashboard, PlatformLogRow } from '@/lib/observability/types'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'X-API-Version': 'v1' },
  })
  if (!response.ok) throw new Error('Request failed')
  const json = (await response.json()) as { data: T }
  return json.data
}

export function ObservabilityDashboardPanel() {
  const [dashboard, setDashboard] = useState<ObservabilityDashboard | null>(null)
  const [logs, setLogs] = useState<PlatformLogRow[]>([])
  const [alerts, setAlerts] = useState<AlertSummary[]>([])
  const [correlationId, setCorrelationId] = useState('')
  const [trace, setTrace] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dash, logRows, alertRows] = await Promise.all([
        fetchJson<ObservabilityDashboard>('/api/observability/dashboard'),
        fetchJson<PlatformLogRow[]>('/api/observability/logs?limit=20'),
        fetchJson<AlertSummary[]>('/api/observability/alerts?status=open'),
      ])
      setDashboard(dash)
      setLogs(logRows)
      setAlerts(alertRows)
    } catch {
      setError('Could not load observability data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function lookupTrace() {
    const id = correlationId.trim()
    if (!id) return
    setTrace(null)
    try {
      const row = await fetchJson<unknown[]>(`/api/observability/traces/${id}`)
      setTrace({ spans: row })
    } catch {
      setError('Trace not found.')
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading observability dashboard…</p>
  }

  if (error && !dashboard) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {dashboard ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="API p95" value={`${dashboard.latency.api.p95Ms} ms`} />
          <MetricCard title="Open alerts" value={String(dashboard.alerts.length)} />
          <MetricCard title="Errors (24h)" value={String(dashboard.logs.errorCount24h)} />
          <MetricCard title="Recent traces" value={String(dashboard.traces.recentCount)} />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Trace lookup</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            placeholder="Correlation ID"
            value={correlationId}
            onChange={(event) => setCorrelationId(event.target.value)}
            className="max-w-md"
          />
          <Button type="button" onClick={() => void lookupTrace()}>
            Lookup
          </Button>
          {trace ? (
            <pre className="mt-4 w-full overflow-x-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(trace, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {!alerts.length ? (
              <p className="text-sm text-muted-foreground">No open alerts.</p>
            ) : (
              <ul className="space-y-3">
                {alerts.map((alert) => (
                  <li key={alert.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{alert.title}</p>
                      <Badge variant="outline" className="capitalize">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{alert.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent logs</CardTitle>
          </CardHeader>
          <CardContent>
            {!logs.length ? (
              <p className="text-sm text-muted-foreground">No recent logs.</p>
            ) : (
              <ul className="space-y-2">
                {logs.map((log) => (
                  <li key={log.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="uppercase">
                        {log.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{log.category}</span>
                    </div>
                    <p className="mt-1">{log.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
