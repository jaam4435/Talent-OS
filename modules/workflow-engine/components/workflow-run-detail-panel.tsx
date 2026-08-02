'use client'

import Link from 'next/link'
import type {
  WorkflowExecutionHistoryEntry,
  WorkflowJobRecord,
  WorkflowRunRecord,
} from '@/modules/workflow-engine/types'
import { useWorkflows } from '@/modules/workflow-engine/hooks/use-workflows'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { DataTable, type DataTableColumn } from '@/modules/core/components/shared/data-table'
import { formatDateTime } from '@/modules/core/utils/format'

interface WorkflowRunDetailPanelProps {
  run: WorkflowRunRecord
  history: WorkflowExecutionHistoryEntry[]
  jobs: WorkflowJobRecord[]
}

export function WorkflowRunDetailPanel({ run, history, jobs }: WorkflowRunDetailPanelProps) {
  const { api, error, isPending, run: runAction } = useWorkflows()

  const failedJobs = jobs.filter((job) => job.status === 'failed' || job.status === 'dead_letter')

  const historyColumns: DataTableColumn<WorkflowExecutionHistoryEntry>[] = [
    {
      id: 'step',
      header: 'Step',
      cell: (row) => (
        <>
          <p className="font-medium">{row.stepId}</p>
          <p className="text-sm text-muted-foreground">{row.actionType}</p>
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
      id: 'duration',
      header: 'Duration',
      cell: (row) => (row.durationMs != null ? `${row.durationMs}ms` : '—'),
    },
    {
      id: 'created',
      header: 'Recorded',
      cell: (row) => formatDateTime(row.createdAt),
    },
  ]

  const jobColumns: DataTableColumn<WorkflowJobRecord>[] = [
    { id: 'step', header: 'Step', cell: (row) => row.stepId },
    { id: 'action', header: 'Action', cell: (row) => row.actionType },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.status === 'failed' || row.status === 'dead_letter' ? 'destructive' : 'secondary'}>
          {row.status}
        </Badge>
      ),
    },
    { id: 'retries', header: 'Retries', cell: (row) => `${row.retryCount}/${row.maxRetries}` },
    { id: 'error', header: 'Error', cell: (row) => row.lastError ?? '—' },
  ]

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{run.workflowId}</CardTitle>
              <p className="text-sm text-muted-foreground">{run.triggerEventType}</p>
            </div>
            <Badge variant={run.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize">
              {run.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Correlation ID</p>
            <p className="text-sm text-muted-foreground">{run.correlationId}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Current step</p>
            <p className="text-sm text-muted-foreground">{run.currentStepId ?? '—'}</p>
          </div>
          {run.lastError ? (
            <div className="md:col-span-2">
              <p className="text-sm font-medium">Last error</p>
              <p className="text-sm text-destructive">{run.lastError}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {failedJobs.length ? (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isPending}
            onClick={() =>
              runAction(() => api.retryJobs(failedJobs.map((job) => job.id)))
            }
          >
            Retry failed jobs ({failedJobs.length})
          </Button>
          <Button variant="outline" asChild>
            <Link href="/workflows/approvals">Open approvals</Link>
          </Button>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Execution history</h2>
        {history.length ? (
          <DataTable columns={historyColumns} data={history} getRowKey={(row) => row.id} />
        ) : (
          <p className="text-sm text-muted-foreground">No execution history recorded.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Jobs</h2>
        {jobs.length ? (
          <DataTable columns={jobColumns} data={jobs} getRowKey={(row) => row.id} />
        ) : (
          <p className="text-sm text-muted-foreground">No jobs queued for this run.</p>
        )}
      </section>
    </div>
  )
}
