'use server'

import { revalidatePath } from 'next/cache'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import { requireTenant } from '@/modules/core/services/session'
import { emitEvent } from '@/lib/integrations/events'
import { createProjectSchema, validateMilestoneBudget } from '@/lib/projects/validation'
import type { CreateProjectInput } from '@/lib/projects/types'
import {
  FREELANCER_STATUS_TRANSITIONS,
  MANAGER_STATUS_TRANSITIONS,
} from '@/lib/projects/types'
import type { ProjectStatus } from '@/modules/core/types/enums'
import { createRepositories } from '@/lib/repositories/factory'
import { isDomainError } from '@/modules/core/utils/errors'

function mapRpcError(message: string): string {
  if (message.includes('MILESTONES_REQUIRED')) return 'At least one milestone is required.'
  if (message.includes('MILESTONE_BUDGET_EXCEEDED')) return 'Milestone amounts exceed the project budget.'
  if (message.includes('OPPORTUNITY_NOT_FOUND')) return 'Opportunity not found.'
  if (message.includes('FREELANCER_NOT_FOUND')) return 'Freelancer not found.'
  if (message.includes('FORBIDDEN')) return 'You do not have permission to create projects.'
  if (message.includes('COMPANY_NOT_FOUND')) return 'Company not found.'
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

  const repos = await createRepositories()
  const milestonesPayload = parsed.data.milestones.map((m, index) => ({
    title: m.title,
    description: m.description ?? '',
    amount: m.amount,
    due_date: m.dueDate ?? '',
    sort_order: index + 1,
    status: 'pending',
  }))

  let projectId: string
  try {
    projectId = await repos.project.createWithMilestones({
      tenantId: tenant.id,
      assignedBy: user.id,
      freelancerId: parsed.data.freelancerId,
      title: parsed.data.title,
      milestones: milestonesPayload,
      opportunityId: parsed.data.opportunityId ?? null,
      shortlistId: parsed.data.shortlistId ?? null,
      description: parsed.data.description ?? null,
      clientName: parsed.data.clientName ?? null,
      budget: parsed.data.budget ?? null,
      currency: parsed.data.currency ?? tenant.currency,
      status: parsed.data.status ?? 'active',
      companyId: parsed.data.companyId ?? null,
    })
  } catch (error) {
    const message = isDomainError(error) ? error.message : error instanceof Error ? error.message : 'Unknown error'
    return { ok: false as const, error: mapRpcError(message) }
  }

  const [freelancer, firstMilestoneDue] = await Promise.all([
    repos.talent.findContactById(parsed.data.freelancerId),
    repos.task.findFirstDueDate(projectId),
  ])

  await emitEvent({
    tenantId: tenant.id,
    eventType: 'project.assigned',
    aggregateType: 'project',
    aggregateId: projectId,
    idempotencyKey: `project-assigned:${projectId}`,
    actorId: user.id,
    payload: {
      project_id: projectId,
      freelancer_id: parsed.data.freelancerId,
      freelancer_name: freelancer?.full_name,
      freelancer_email: freelancer?.email,
      freelancer_phone: freelancer?.phone,
      title: parsed.data.title,
      first_milestone_due: firstMilestoneDue,
      project_url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${projectId}`,
    },
  })

  revalidatePath('/projects')
  if (parsed.data.opportunityId) {
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`)
    revalidatePath(`/opportunities/${parsed.data.opportunityId}/shortlist`)
  }

  return { ok: true as const, projectId }
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'projects:update')

  const repos = await createRepositories()
  const project = await repos.project.findSummary(projectId, tenant.id)

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

  try {
    await repos.project.updateStatus(projectId, patch)
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Update failed' }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true as const }
}

export async function updateProjectStatusAsFreelancer(projectId: string, status: ProjectStatus) {
  const { tenant, user } = await requireTenant()

  if (tenant.role !== 'freelancer') {
    return { ok: false as const, error: 'FORBIDDEN' }
  }

  const repos = await createRepositories()
  const project = await repos.project.findSummary(projectId, tenant.id)

  if (!project) {
    return { ok: false as const, error: 'Project not found' }
  }

  const freelancerUserId = await repos.talent.findUserIdByFreelancerId(project.freelancer_id)
  if (freelancerUserId !== user.id) {
    return { ok: false as const, error: 'FORBIDDEN' }
  }

  const allowed = FREELANCER_STATUS_TRANSITIONS[project.status as ProjectStatus] ?? []
  if (!allowed.includes(status)) {
    return { ok: false as const, error: `Cannot move project to ${status}` }
  }

  try {
    await repos.project.updateStatus(projectId, { status })
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Update failed' }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true as const }
}
