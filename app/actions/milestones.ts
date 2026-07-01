'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { requirePermission } from '@/lib/auth/permissions'
import { isManager } from '@/lib/auth/permissions'
import { emitEvent } from '@/lib/integrations/events'
import type { MilestoneStatus } from '@/types/enums'

export async function updateMilestoneStatus(
  milestoneId: string,
  status: MilestoneStatus,
  note?: string
) {
  const { tenant, user } = await requireTenant()
  const supabase = await createClient()

  const { data: milestone } = await supabase
    .from('milestones')
    .select('id, project_id, status, tenant_id')
    .eq('id', milestoneId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!milestone) {
    return { ok: false as const, error: 'Milestone not found' }
  }

  if (isManager(tenant.role)) {
    requirePermission(tenant.role, 'projects:update')
  } else if (status === 'in_progress') {
    const { data: project } = await supabase
      .from('projects')
      .select('freelancer_id')
      .eq('id', milestone.project_id)
      .maybeSingle()

    if (!project) {
      return { ok: false as const, error: 'Project not found' }
    }

    const { data: freelancer } = await supabase
      .from('freelancers')
      .select('user_id')
      .eq('id', project.freelancer_id)
      .maybeSingle()

    if (freelancer?.user_id !== user.id) {
      return { ok: false as const, error: 'FORBIDDEN' }
    }
  } else {
    return { ok: false as const, error: 'FORBIDDEN' }
  }

  const { error } = await supabase
    .from('milestones')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', milestoneId)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath(`/projects/${milestone.project_id}`)
  return { ok: true as const }
}

export async function submitMilestone(milestoneId: string, submissionNote?: string) {
  const { tenant, user } = await requireTenant()
  const supabase = await createClient()

  const { data: milestone } = await supabase
    .from('milestones')
    .select('id, project_id, title, status, tenant_id')
    .eq('id', milestoneId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!milestone) {
    return { ok: false as const, error: 'Milestone not found' }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, assigned_by, freelancer_id')
    .eq('id', milestone.project_id)
    .maybeSingle()

  if (!project) {
    return { ok: false as const, error: 'Project not found' }
  }

  const { data: freelancer } = await supabase
    .from('freelancers')
    .select('user_id')
    .eq('id', project.freelancer_id)
    .maybeSingle()

  if (freelancer?.user_id !== user.id) {
    return { ok: false as const, error: 'Only the assigned freelancer can submit' }
  }

  if (!['pending', 'in_progress', 'revision'].includes(milestone.status)) {
    return { ok: false as const, error: 'Milestone cannot be submitted in its current state' }
  }

  const { error } = await supabase
    .from('milestones')
    .update({
      status: 'submitted',
      submission_note: submissionNote ?? null,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', milestoneId)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  await supabase.from('projects').update({ status: 'in_review' }).eq('id', milestone.project_id)

  if (project?.assigned_by) {
    await supabase.from('notifications').insert({
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
      project_title: project?.title,
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

  const supabase = await createClient()

  const { data: milestone } = await supabase
    .from('milestones')
    .select('id, project_id, title, status, tenant_id')
    .eq('id', milestoneId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!milestone) {
    return { ok: false as const, error: 'Milestone not found' }
  }

  if (milestone.status !== 'submitted') {
    return { ok: false as const, error: 'Only submitted milestones can be reviewed' }
  }

  const newStatus = action === 'approve' ? 'approved' : 'revision'

  const { error } = await supabase
    .from('milestones')
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      review_note: reviewNote ?? null,
    })
    .eq('id', milestoneId)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('title, freelancer_id')
    .eq('id', milestone.project_id)
    .maybeSingle()

  const { data: freelancer } = project
    ? await supabase.from('freelancers').select('user_id').eq('id', project.freelancer_id).maybeSingle()
    : { data: null }

  if (freelancer?.user_id) {
    await supabase.from('notifications').insert({
      tenant_id: tenant.id,
      user_id: freelancer.user_id,
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
    const { count } = await supabase
      .from('milestones')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', milestone.project_id)
      .neq('status', 'approved')

    if ((count ?? 0) === 0) {
      await supabase
        .from('projects')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', milestone.project_id)
    } else {
      await supabase.from('projects').update({ status: 'active' }).eq('id', milestone.project_id)
    }
  } else {
    await supabase.from('projects').update({ status: 'active' }).eq('id', milestone.project_id)
  }

  revalidatePath(`/projects/${milestone.project_id}`)
  revalidatePath('/projects')
  return { ok: true as const }
}
