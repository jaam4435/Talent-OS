import { listWorkflowApprovals } from '@/lib/queries/workflow.queries'
import { WorkflowApprovalInbox } from '@/modules/workflow-engine/components/workflow-approval-inbox'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Workflows · Approvals' }

export default async function WorkflowApprovalsPage() {
  const { tenant, user } = await requireManager()
  const approvals = await listWorkflowApprovals(user.id, tenant.id)

  return <WorkflowApprovalInbox approvals={approvals as never} />
}
