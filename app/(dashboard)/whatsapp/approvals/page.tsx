import { listWhatsAppApprovals } from '@/lib/queries/whatsapp.queries'
import { WhatsAppApprovalInbox } from '@/modules/whatsapp-platform/components/whatsapp-approval-inbox'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'WhatsApp · Approvals' }

export default async function WhatsAppApprovalsPage() {
  const { tenant, user } = await requireManager()
  const approvals = await listWhatsAppApprovals(user.id, tenant.id)

  return (
    <WhatsAppApprovalInbox
      whatsappGates={approvals.whatsappGates}
      workflowApprovalCount={approvals.workflowApprovals.length}
    />
  )
}
