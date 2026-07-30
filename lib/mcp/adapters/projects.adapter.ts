import type { ProjectsToolInputs } from '@/lib/mcp/servers/projects.server'
import { mcpErr, mcpOk, paginate, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const PROJECTS_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  projects_list: async (input, ctx) => {
    const data = asInput<ProjectsToolInputs['projects_list']>(input)
    const { tenantId, userId, role } = ctx.execution
    const pageData = await ctx.services.project.getProjectsForPage(tenantId, role, userId)
    let filtered = pageData.projects
    if (data.status) filtered = filtered.filter((p) => p.status === data.status)
    if (data.freelancer_id) filtered = filtered.filter((p) => p.freelancer_id === data.freelancer_id)
    if (data.company_id) filtered = filtered.filter((p) => p.company_id === data.company_id)
    return mcpOk(paginate(filtered, data.page, data.limit))
  },

  projects_get: async (input, ctx) => {
    const { project_id } = asInput<ProjectsToolInputs['projects_get']>(input)
    const detail = await ctx.services.project.getProjectDetail(project_id, ctx.execution.tenantId)
    if (!detail) return mcpErr('Project not found', 'NOT_FOUND')
    return mcpOk(detail)
  },

  projects_create: async (input, ctx) => {
    const data = asInput<ProjectsToolInputs['projects_create']>(input)
    const result = await ctx.services.project.createProject({
      tenantId: ctx.execution.tenantId,
      tenantCurrency: 'USD',
      assignedBy: ctx.execution.userId,
      data: {
        title: data.title,
        freelancerId: data.freelancer_id,
        companyId: data.company_id,
        opportunityId: data.opportunity_id,
        budget: data.budget,
        milestones:
          data.milestones?.map((m) => ({
            title: m.title,
            amount: m.amount,
            dueDate: m.due_date,
          })) ?? [],
      },
    })
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: result.projectId })
  },

  projects_update_status: async (input, ctx) => {
    const data = asInput<ProjectsToolInputs['projects_update_status']>(input)
    const role = ctx.execution.role === 'freelancer' ? 'freelancer' : 'manager'
    const result = await ctx.services.project.updateProjectStatus(
      data.project_id,
      ctx.execution.tenantId,
      data.status as never,
      role,
      ctx.execution.userId
    )
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: data.project_id, success: true })
  },

  projects_list_milestones: async (input, ctx) => {
    const { project_id } = asInput<ProjectsToolInputs['projects_list_milestones']>(input)
    const detail = await ctx.services.project.getProjectDetail(project_id, ctx.execution.tenantId)
    if (!detail) return mcpErr('Project not found', 'NOT_FOUND')
    return mcpOk({ milestones: detail.milestones ?? [] })
  },

  projects_submit_milestone: async (input, ctx) => {
    const data = asInput<ProjectsToolInputs['projects_submit_milestone']>(input)
    const result = await ctx.services.workflow.submitMilestone(
      data.milestone_id,
      ctx.execution.tenantId,
      ctx.execution.userId,
      data.submission_note
    )
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: data.milestone_id, success: true })
  },

  projects_review_milestone: async (input, ctx) => {
    const data = asInput<ProjectsToolInputs['projects_review_milestone']>(input)
    const result = await ctx.services.workflow.reviewMilestone(
      data.milestone_id,
      ctx.execution.tenantId,
      ctx.execution.userId,
      data.decision === 'approved' ? 'approve' : 'revision',
      data.review_note
    )
    if (!result.ok) return mcpErr(result.error)
    return mcpOk({ id: data.milestone_id, success: true })
  },
}
