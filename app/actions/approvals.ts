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
