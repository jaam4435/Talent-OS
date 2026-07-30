import { createServices } from '@/lib/services/factory'
import type { MilestoneRow } from '@/lib/projects/types'

export async function getProjectsForPage(tenantId: string, role: string, userId: string) {
  const services = await createServices()
  return services.project.getProjectsForPage(tenantId, role, userId)
}

export async function getProjectDetail(projectId: string, tenantId: string) {
  const services = await createServices()
  return services.project.getProjectDetail(projectId, tenantId)
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

export async function getNewProjectFormData(tenantId: string, opportunityId?: string) {
  const services = await createServices()
  return services.project.getNewProjectFormData(tenantId, opportunityId)
}

export async function getProjectsForFreelancerDashboard(freelancerId: string) {
  const services = await createServices()
  return services.project.getProjectsForFreelancerDashboard(freelancerId)
}

export async function getClientDashboardProjects(tenantId: string, companyId: string | null) {
  const services = await createServices()
  return services.project.getClientDashboardProjects(tenantId, companyId)
}
