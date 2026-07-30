import { createRepositories } from '@/lib/repositories/factory'
import type { ProjectStatus } from '@/modules/core/types/enums'
import type { MilestoneRow } from '@/lib/projects/types'
import type { Tables } from '@/modules/core/types/database'

export async function getProjectsForPage(tenantId: string, role: string, userId: string) {
  const repos = await createRepositories()

  let freelancerId: string | undefined
  if (role === 'freelancer') {
    freelancerId = (await repos.talent.findIdByUserId(userId, tenantId)) ?? undefined
    if (!freelancerId) {
      return { projects: [], freelancerMap: new Map<string, { full_name: string }>() }
    }
  }

  const result = await repos.project.listByTenant(tenantId, {
    freelancerId,
  })

  const freelancerIds = [...new Set(result.data.map((p) => p.freelancer_id))]
  const freelancers = await repos.talent.findNamesByIds(freelancerIds)
  const freelancerMap = new Map(freelancers.map((f) => [f.id, f]))

  return {
    projects: result.data.map((p) => ({
      ...p,
      status: p.status as ProjectStatus,
    })),
    freelancerMap,
  }
}

export async function getProjectDetail(projectId: string, tenantId: string) {
  const repos = await createRepositories()
  const project = await repos.project.findById(projectId, tenantId)
  if (!project) return null

  const [milestones, freelancer, activity] = await Promise.all([
    repos.task.listByProject(projectId),
    repos.talent.findContactById(project.freelancer_id),
    repos.activityLog.listByEntity('project', projectId, 10),
  ])

  return { project, milestones, freelancer, activity }
}

export function mapProjectMilestones(
  milestones: NonNullable<Awaited<ReturnType<typeof getProjectDetail>>>['milestones']
): MilestoneRow[] {
  return milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    amount: Number(m.amount),
    dueDate: m.due_date,
    status: m.status as MilestoneRow['status'],
    sortOrder: m.sort_order,
    submissionNote: m.submission_note,
    submittedAt: m.submitted_at,
    reviewNote: m.review_note,
  }))
}

export async function getNewProjectFormData(
  tenantId: string,
  opportunityId?: string
) {
  const repos = await createRepositories()

  const [freelancers, companies] = await Promise.all([
    repos.talent.listForProjectForm(tenantId),
    repos.company.listByTenant(tenantId),
  ])

  if (!opportunityId) {
    return { freelancers, companies, defaults: null as null }
  }

  const opportunity = await repos.lead.findForProjectDefaults(opportunityId, tenantId)
  if (!opportunity) return { freelancers, companies, defaults: null }

  const shortlistId = await repos.shortlist.findIdByOpportunity(opportunityId)

  return {
    freelancers,
    companies,
    defaults: {
      title: opportunity.title,
      description: opportunity.description ?? undefined,
      clientName: opportunity.client_name ?? undefined,
      companyId: opportunity.company_id ?? undefined,
      budget: opportunity.budget ?? undefined,
      currency: opportunity.currency,
      shortlistId: shortlistId ?? undefined,
      opportunity,
    },
  }
}

export async function getProjectsForFreelancerDashboard(freelancerId: string) {
  const repos = await createRepositories()
  const result = await repos.project.listForFreelancer(freelancerId)
  return result.data
}

export async function getClientDashboardProjects(tenantId: string, companyId: string | null) {
  const repos = await createRepositories()
  const result = await repos.project.listByTenant(
    tenantId,
    companyId ? { companyId } : undefined,
    { limit: 10 }
  )
  return result.data
}
