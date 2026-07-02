'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/guards'
import { requirePermission } from '@/lib/auth/permissions'
import { requireTenant } from '@/lib/auth/session'
import { emitEvent } from '@/lib/integrations/events'
import { createProjectSchema, validateMilestoneBudget } from '@/lib/projects/validation'
import type { CreateProjectInput } from '@/lib/projects/types'
import {
  FREELANCER_STATUS_TRANSITIONS,
  MANAGER_STATUS_TRANSITIONS,
} from '@/lib/projects/types'
import type { ProjectStatus } from '@/types/enums'

function mapRpcError(message: string): string {
  if (message.includes('MILESTONES_REQUIRED')) return 'At least one milestone is required.'
  if (message.includes('MILESTONE_BUDGET_EXCEEDED')) return 'Milestone amounts exceed the project budget.'
  if (message.includes('OPPORTUNITY_NOT_FOUND')) return 'Opportunity not found.'
  if (message.includes('FREELANCER_NOT_FOUND')) return 'Freelancer not found.'
  if (message.includes('FORBIDDEN')) return 'You do not have permission to create projects.'
  return message
}

export async function createProject(input: CreateProjectInput) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'projects:create')

  const parsed = createProjectSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const budgetError = validateMilestoneBudget(parsed.data.milestones, parsed.data.budget)
  if (budgetError) {
    return { ok: false as const, error: budgetError }
  }

  const supabase = await createClient()
  const milestonesPayload = parsed.data.milestones.map((m, index) => ({
    title: m.title,
    description: m.description ?? '',
    amount: m.amount,
    due_date: m.dueDate ?? '',
    sort_order: index + 1,
    status: 'pending',
  }))

  const { data: projectId, error } = await supabase.rpc('create_project_with_milestones', {
    p_tenant_id: tenant.id,
    p_assigned_by: user.id,
    p_freelancer_id: parsed.data.freelancerId,
    p_title: parsed.data.title,
    p_milestones: milestonesPayload,
    p_opportunity_id: parsed.data.opportunityId ?? null,
    p_shortlist_id: parsed.data.shortlistId ?? null,
    p_description: parsed.data.description ?? null,
    p_client_name: parsed.data.clientName ?? null,
    p_budget: parsed.data.budget ?? null,
    p_currency: parsed.data.currency ?? tenant.currency,
    p_status: parsed.data.status ?? 'active',
  })

  if (error) {
    return { ok: false as const, error: mapRpcError(error.message) }
  }

  if (parsed.data.companyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', parsed.data.companyId)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    await supabase
      .from('projects')
      .update({
        company_id: parsed.data.companyId,
        client_name: company?.name ?? parsed.data.clientName ?? null,
      })
      .eq('id', projectId as string)
  }

  const { data: freelancer } = await supabase
    .from('freelancers')
    .select('full_name, email, phone, user_id')
    .eq('id', parsed.data.freelancerId)
    .maybeSingle()

  const { data: firstMilestone } = await supabase
    .from('milestones')
    .select('due_date')
    .eq('project_id', projectId as string)
    .order('sort_order')
    .limit(1)
    .maybeSingle()

  await emitEvent({
    tenantId: tenant.id,
    eventType: 'project.assigned',
    aggregateType: 'project',
    aggregateId: projectId as string,
    idempotencyKey: `project-assigned:${projectId}`,
    actorId: user.id,
    payload: {
      project_id: projectId,
      freelancer_id: parsed.data.freelancerId,
      freelancer_name: freelancer?.full_name,
      freelancer_email: freelancer?.email,
      freelancer_phone: freelancer?.phone,
      title: parsed.data.title,
      first_milestone_due: firstMilestone?.due_date ?? null,
      project_url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`,
    },
  })

  revalidatePath('/projects')
  if (parsed.data.opportunityId) {
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`)
    revalidatePath(`/opportunities/${parsed.data.opportunityId}/shortlist`)
  }

  return { ok: true as const, projectId: projectId as string }
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'projects:update')

  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, status, tenant_id')
    .eq('id', projectId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!project) {
    return { ok: false as const, error: 'Project not found' }
  }

  const allowed = MANAGER_STATUS_TRANSITIONS[project.status as ProjectStatus] ?? []
  if (!allowed.includes(status) && project.status !== status) {
    return { ok: false as const, error: `Cannot move from ${project.status} to ${status}` }
  }

  const patch: Record<string, unknown> = { status }
  if (status === 'active' && project.status === 'draft') {
    patch.started_at = new Date().toISOString()
  }
  if (status === 'completed') {
    patch.completed_at = new Date().toISOString()
  }

  const { error } = await supabase.from('projects').update(patch).eq('id', projectId)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true as const }
}

export async function updateProjectStatusAsFreelancer(projectId: string, status: ProjectStatus) {
  const { tenant } = await requireTenant()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, error: 'UNAUTHORIZED' }
  }

  if (tenant.role !== 'freelancer') {
    return { ok: false as const, error: 'FORBIDDEN' }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, status, tenant_id, freelancer_id')
    .eq('id', projectId)
    .eq('tenant_id', tenant.id)
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

  const allowed = FREELANCER_STATUS_TRANSITIONS[project.status as ProjectStatus] ?? []
  if (!allowed.includes(status)) {
    return { ok: false as const, error: `Cannot move project to ${status}` }
  }

  const { error } = await supabase.from('projects').update({ status }).eq('id', projectId)

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true as const }
}
