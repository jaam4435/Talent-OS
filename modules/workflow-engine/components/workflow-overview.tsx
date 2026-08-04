import Link from 'next/link'
import type { WorkflowObservabilitySummary, WorkflowRunRecord } from '@/modules/workflow-engine/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { Badge } from '@/modules/core/components/ui/badge'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { formatDateTime, formatRelative } from '@/modules/core/utils/format'

interface WorkflowOverviewProps {
  summary: WorkflowObservabilitySummary
  recentRuns: WorkflowRunRecord[]
}

export function WorkflowOverview({ summary, recentRuns }: WorkflowOverviewProps) {
  const kpis = [
    { label: 'Total runs', value: summary.totalRuns },
    { label: 'Running', value: summary.runningRuns },
    { label: 'Failed', value: summary.failedRuns },
    { label: 'Dead letter jobs', value: summary.deadLetterJobs },
    { label: 'Pending jobs', value: summary.pendingJobs },
    { label: 'Pending compensations', value: summary.pendingCompensations },
  ]

  const columns: DataTableColumn<WorkflowRunRecord>[] = [
    {
      id: 'workflow',
      header: 'Run',
      cell: (row) => (
        <>
          <Link href={`/workflows/runs/${row.id}`} className="font-medium hover:underline">
            {row.workflowId}
          </Link>
          <p className="text-sm text-muted-foreground">{row.triggerEventType}</p>
        </>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'started',
      header: 'Started',
      cell: (row) => (row.startedAt ? formatRelative(row.startedAt) : '—'),
    },
    {
      id: 'error',
      header: 'Last error',
      cell: (row) => row.lastError ?? '—',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent runs</h2>
          <Link href="/workflows/runs" className="text-sm font-medium hover:underline">
            View all
          </Link>
        </div>
        {recentRuns.length ? (
          <DataTable columns={columns} data={recentRuns} getRowKey={(row) => row.id} />
        ) : (
          <p className="text-sm text-muted-foreground">No workflow runs recorded yet.</p>
        )}
      </section>
    </div>
  )
}

export function WorkflowRunsTable({ runs }: { runs: WorkflowRunRecord[] }) {
  const columns: DataTableColumn<WorkflowRunRecord>[] = [
    {
      id: 'workflow',
      header: 'Workflow',
      cell: (row) => (
        <Link href={`/workflows/runs/${row.id}`} className="font-medium hover:underline">
          {row.workflowId}
        </Link>
      ),
    },
    {
      id: 'trigger',
      header: 'Trigger',
      cell: (row) => row.triggerEventType,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'started',
      header: 'Started',
      cell: (row) => (row.startedAt ? formatDateTime(row.startedAt) : '—'),
    },
    {
      id: 'completed',
      header: 'Completed',
      cell: (row) => (row.completedAt ? formatDateTime(row.completedAt) : '—'),
    },
  ]

  return runs.length ? (
    <DataTable columns={columns} data={runs} getRowKey={(row) => row.id} />
  ) : (
    <p className="text-sm text-muted-foreground">No runs match the current filters.</p>
  )
}
