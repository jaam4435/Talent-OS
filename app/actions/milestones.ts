'use server'

import { revalidatePath } from 'next/cache'
import { requireTenant } from '@/modules/core/services/session'
import { requirePermission } from '@/modules/core/services/permissions'
import { isManager } from '@/modules/core/services/permissions'
import { emitEvent } from '@/lib/integrations/events'
import type { MilestoneStatus } from '@/modules/core/types/enums'
import { createRepositories } from '@/lib/repositories/factory'

export async function updateMilestoneStatus(
  milestoneId: string,
  status: MilestoneStatus,
  note?: string
) {
  const { tenant, user } = await requireTenant()
  const repos = await createRepositories()

  const milestone = await repos.task.findSummary(milestoneId, tenant.id)
  if (!milestone) {
    return { ok: false as const, error: 'Milestone not found' }
  }

  if (isManager(tenant.role)) {
    requirePermission(tenant.role, 'projects:update')
  } else if (status === 'in_progress') {
    const project = await repos.project.findSummary(milestone.project_id, tenant.id)
    if (!project) {
      return { ok: false as const, error: 'Project not found' }
    }

    const freelancerUserId = await repos.talent.findUserIdByFreelancerId(project.freelancer_id)
    if (freelancerUserId !== user.id) {
      return { ok: false as const, error: 'FORBIDDEN' }
    }
  } else {
    return { ok: false as const, error: 'FORBIDDEN' }
  }

  try {
    await repos.task.update(milestoneId, { status, updated_at: new Date().toISOString() })
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Update failed' }
  }

  revalidatePath(`/projects/${milestone.project_id}`)
  return { ok: true as const }
}

export async function submitMilestone(milestoneId: string, submissionNote?: string) {
  const { tenant, user } = await requireTenant()
  const repos = await createRepositories()

  const milestone = await repos.task.findSummary(milestoneId, tenant.id)
  if (!milestone) {
    return { ok: false as const, error: 'Milestone not found' }
  }

  const project = await repos.project.findById(milestone.project_id, tenant.id)
  if (!project) {
    return { ok: false as const, error: 'Project not found' }
  }

  const freelancerUserId = await repos.talent.findUserIdByFreelancerId(project.freelancer_id)
  if (freelancerUserId !== user.id) {
    return { ok: false as const, error: 'Only the assigned freelancer can submit' }
  }

  if (!['pending', 'in_progress', 'revision'].includes(milestone.status)) {
    return { ok: false as const, error: 'Milestone cannot be submitted in its current state' }
  }

  try {
    await repos.task.submit(milestoneId, submissionNote ?? null)
    await repos.project.updateStatus(milestone.project_id, { status: 'in_review' })
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Submit failed' }
  }

  await repos.activityLog.create({
    tenant_id: tenant.id,
    actor_id: user.id,
    entity_type: 'project',
    entity_id: milestone.project_id,
    action: 'milestone_submitted',
    metadata: { milestone_id: milestoneId, milestone_title: milestone.title },
  })

  if (project.assigned_by) {
    await repos.notification.create({
      tenant_id: tenant.id,
      user_id: project.assigned_by,
      type: 'milestone_submitted',
      title: 'Milestone submitted for review',
      body: `"${milestone.title}" on ${project.title} was submitted.`,
      data: { project_id: project.id, milestone_id: milestoneId },
    })
  }

  await emitEvent({
    tenantId: tenant.id,
    eventType: 'milestone.submitted',
    aggregateType: 'milestone',
    aggregateId: milestoneId,
    idempotencyKey: `milestone-submitted:${milestoneId}`,
    actorId: user.id,
    payload: {
      milestone_id: milestoneId,
      project_id: milestone.project_id,
      project_title: project.title,
    },
  })

  revalidatePath(`/projects/${milestone.project_id}`)
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

  if (action === 'revision' && !reviewNote?.trim()) {
    return { ok: false as const, error: 'Revision feedback is required' }
  }

  const repos = await createRepositories()
  const milestone = await repos.task.findSummary(milestoneId, tenant.id)

  if (!milestone) {
    return { ok: false as const, error: 'Milestone not found' }
  }

  if (milestone.status !== 'submitted') {
    return { ok: false as const, error: 'Only submitted milestones can be reviewed' }
  }

  const newStatus = action === 'approve' ? 'approved' : 'revision'

  try {
    await repos.task.review(milestoneId, newStatus, user.id, reviewNote ?? null)
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Review failed' }
  }

  await repos.activityLog.create({
    tenant_id: tenant.id,
    actor_id: user.id,
    entity_type: 'project',
    entity_id: milestone.project_id,
    action: action === 'approve' ? 'milestone_approved' : 'milestone_revision_requested',
    metadata: {
      milestone_id: milestoneId,
      milestone_title: milestone.title,
      review_note: reviewNote ?? null,
    },
  })

  const project = await repos.project.findById(milestone.project_id, tenant.id)
  const freelancerUserId = project
    ? await repos.talent.findUserIdByFreelancerId(project.freelancer_id)
    : null

  if (freelancerUserId) {
    await repos.notification.create({
      tenant_id: tenant.id,
      user_id: freelancerUserId,
      type: action === 'approve' ? 'milestone_approved' : 'milestone_revision',
      title: action === 'approve' ? 'Milestone approved' : 'Revision requested',
      body:
        action === 'approve'
          ? `"${milestone.title}" was approved.`
          : `Revision requested on "${milestone.title}": ${reviewNote}`,
      data: { project_id: milestone.project_id, milestone_id: milestoneId },
    })
  }

  if (action === 'approve') {
    const remaining = await repos.task.countNonApprovedByProject(milestone.project_id)
    if (remaining === 0) {
      await repos.project.updateStatus(milestone.project_id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
    } else {
      await repos.project.updateStatus(milestone.project_id, { status: 'active' })
    }
  } else {
    await repos.project.updateStatus(milestone.project_id, { status: 'active' })
  }

  revalidatePath(`/projects/${milestone.project_id}`)
  revalidatePath('/projects')
  return { ok: true as const }
}
