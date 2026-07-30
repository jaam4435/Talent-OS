'use server'

import { revalidatePath } from 'next/cache'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import { requireTenant } from '@/modules/core/services/session'
import { createProjectSchema, validateMilestoneBudget } from '@/lib/projects/validation'
import type { CreateProjectInput } from '@/lib/projects/types'
import type { ProjectStatus } from '@/modules/core/types/enums'
import { createServices } from '@/lib/services/factory'

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

  const services = await createServices()
  const result = await services.project.createProject({
    tenantId: tenant.id,
    tenantCurrency: tenant.currency,
    assignedBy: user.id,
    data: parsed.data,
  })

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath('/projects')
  if (parsed.data.opportunityId) {
    revalidatePath(`/opportunities/${parsed.data.opportunityId}`)
    revalidatePath(`/opportunities/${parsed.data.opportunityId}/shortlist`)
  }

  return { ok: true as const, projectId: result.projectId }
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'projects:update')

  const services = await createServices()
  const result = await services.project.updateProjectStatus(projectId, tenant.id, status, 'manager')

  if (!result.ok) {
    return { ok: false as const, error: result.error }
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

  const services = await createServices()
  const result = await services.project.updateProjectStatus(
    projectId,
    tenant.id,
    status,
    'freelancer',
    user.id
  )

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
  return { ok: true as const }
}
