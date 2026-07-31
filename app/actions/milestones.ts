'use server'

import { revalidatePath } from 'next/cache'
import { requireTenant } from '@/modules/core/services/session'
import { requirePermission } from '@/modules/core/services/permissions'
import { isManager } from '@/modules/core/services/permissions'
import type { MilestoneStatus } from '@/modules/core/types/enums'
import { createServices } from '@/lib/services/factory'

export async function updateMilestoneStatus(
  milestoneId: string,
  status: MilestoneStatus,
  note?: string
) {
  const { tenant, user } = await requireTenant()
  const manager = isManager(tenant.role)

  if (manager) {
    requirePermission(tenant.role, 'projects:update')
  }

  void note

  const services = await createServices()
  const result = await services.workflow.updateMilestoneStatus(
    milestoneId,
    tenant.id,
    status,
    user.id,
    manager
  )

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath(`/projects/${result.projectId}`)
  return { ok: true as const }
}

export async function submitMilestone(milestoneId: string, submissionNote?: string) {
  const { tenant, user } = await requireTenant()
  const services = await createServices()
  const result = await services.workflow.submitMilestone(
    milestoneId,
    tenant.id,
    user.id,
    submissionNote
  )

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath(`/projects/${result.projectId}`)
  revalidatePath('/projects')
  return { ok: true as const }
}

export async function reviewMilestone(
  milestoneId: string,
  action: 'approve' | 'revision',
  reviewNote?: string
) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'milestones:review')

  const services = await createServices()
  const result = await services.workflow.reviewMilestone(
    milestoneId,
    tenant.id,
    user.id,
    action,
    reviewNote
  )

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath(`/projects/${result.projectId}`)
  revalidatePath('/projects')
  return { ok: true as const }
}
