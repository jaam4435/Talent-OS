import { notFound } from 'next/navigation'
import { getWorkflowRunDetail } from '@/lib/queries/workflow.queries'
import { WorkflowRunDetailPanel } from '@/modules/workflow-engine/components/workflow-run-detail-panel'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Workflows · Run detail' }

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { tenant } = await requireManager()
  const { id } = await params
  const detail = await getWorkflowRunDetail(tenant.id, id)
  if (!detail) notFound()

  return (
    <WorkflowRunDetailPanel run={detail.run} history={detail.history} jobs={detail.jobs} />
  )
}
