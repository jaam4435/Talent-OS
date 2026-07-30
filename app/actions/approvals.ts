'use server'

import { revalidatePath } from 'next/cache'
import { createServices } from '@/lib/services/factory'
import { requireTenant } from '@/modules/core/services/session'

export async function resolveApproval(input: {
  approvalId: string
  decision: 'approved' | 'rejected'
  note?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenant, user } = await requireTenant()
  const services = await createServices()

  const approval = await services.workflowEngine.findApprovalById(input.approvalId)
  if (!approval) {
    return { ok: false, error: 'Approval not found' }
  }
  if (approval.tenant_id !== tenant.id) {
    return { ok: false, error: 'Forbidden' }
  }

  const result = await services.workflowEngine.resolveApproval(
    input.approvalId,
    user.id,
    input.decision,
    input.note
  )

  if (result.ok) {
    revalidatePath('/dashboard')
  }

  return result
}

export async function listPendingApprovals() {
  const { tenant, user } = await requireTenant()
  const services = await createServices()
  return services.workflowEngine.listPendingApprovals(user.id, tenant.id)
}
