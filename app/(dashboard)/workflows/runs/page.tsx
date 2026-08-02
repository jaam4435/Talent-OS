import { Suspense } from 'react'
import { listWorkflowRuns } from '@/lib/queries/workflow.queries'
import { WorkflowRunsTable } from '@/modules/workflow-engine/components/workflow-overview'
import { WorkflowRunsFilters } from '@/modules/workflow-engine/components/workflow-runs-filters'
import { Pagination } from '@/modules/core/components/shared/pagination'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Workflows · Runs' }

export default async function WorkflowRunsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))

  const runs = await listWorkflowRuns(tenant.id, {
    page,
    limit: 20,
    status: typeof params.status === 'string' ? params.status : undefined,
    workflowId: typeof params.workflow_id === 'string' ? params.workflow_id : undefined,
  })

  return (
    <div>
      <Suspense fallback={null}>
        <WorkflowRunsFilters />
      </Suspense>
      <WorkflowRunsTable runs={runs.data} />
      <Suspense fallback={null}>
        <Pagination page={page} hasMore={runs.hasMore} pathname="/workflows/runs" />
      </Suspense>
    </div>
  )
}
