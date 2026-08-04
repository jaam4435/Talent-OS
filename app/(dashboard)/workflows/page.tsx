import { getWorkflowObservability, listWorkflowRuns } from '@/lib/queries/workflow.queries'
import { WorkflowOverview } from '@/modules/workflow-engine/components/workflow-overview'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Workflows' }

export default async function WorkflowsPage() {
  const { tenant } = await requireManager()
  const [{ summary }, recentRuns] = await Promise.all([
    getWorkflowObservability(tenant.id),
    listWorkflowRuns(tenant.id, { limit: 10 }),
  ])

  return <WorkflowOverview summary={summary} recentRuns={recentRuns.data} />
}
