import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import type {
  ProjectDeliverable,
  ProjectHealth,
  ProjectModuleSummary,
  ProjectTask,
  ProjectTemplate,
  ProjectTimelineEvent,
} from '@/modules/project/types'
import type { ProjectStatus } from '@/modules/core/types/enums'

async function projectRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': 'v1',
      ...(init?.headers ?? {}),
    },
  })

  const json = (await response.json()) as ApiResponse<T> | ApiErrorBody
  if (!response.ok || 'error' in json) {
    const err = json as ApiErrorBody
    throw new TalentOsApiError(
      err.error?.code ?? 'INTERNAL_ERROR',
      err.error?.message ?? 'Request failed',
      response.status,
      err.error?.details
    )
  }

  return (json as ApiSuccess<T>).data
}

export const projectApi = {
  getProject(id: string) {
    return projectRequest<ProjectModuleSummary>(`/api/projects/${id}`)
  },

  getHealth(id: string) {
    return projectRequest<ProjectHealth>(`/api/projects/${id}/health`)
  },

  transitionStatus(id: string, status: ProjectStatus, role: 'manager' | 'freelancer' = 'manager') {
    return projectRequest<ProjectModuleSummary>(`/api/projects/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, role }),
    })
  },

  listTasks(projectId: string) {
    return projectRequest<ProjectTask[]>(`/api/projects/${projectId}/tasks`)
  },

  createTask(
    projectId: string,
    body: {
      title: string
      description?: string | null
      milestone_id?: string | null
      status?: string
      priority?: string
      assignee_id?: string | null
      due_date?: string | null
    }
  ) {
    return projectRequest<ProjectTask>(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateTask(
    projectId: string,
    taskId: string,
    body: Partial<{
      title: string
      description: string | null
      status: string
      priority: string
      assignee_id: string | null
      due_date: string | null
    }>
  ) {
    return projectRequest<ProjectTask>(`/api/projects/${projectId}/tasks?task_id=${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  listDeliverables(projectId: string) {
    return projectRequest<ProjectDeliverable[]>(`/api/projects/${projectId}/deliverables`)
  },

  createDeliverable(
    projectId: string,
    body: {
      title: string
      description?: string | null
      milestone_id?: string | null
      task_id?: string | null
      status?: string
      file_path?: string | null
    }
  ) {
    return projectRequest<ProjectDeliverable>(`/api/projects/${projectId}/deliverables`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateDeliverable(
    projectId: string,
    deliverableId: string,
    body: Partial<{
      title: string
      description: string | null
      status: string
      file_path: string | null
    }>
  ) {
    return projectRequest<ProjectDeliverable>(
      `/api/projects/${projectId}/deliverables?deliverable_id=${deliverableId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    )
  },

  getTimeline(projectId: string) {
    return projectRequest<ProjectTimelineEvent[]>(`/api/projects/${projectId}/timeline`)
  },

  listTemplates() {
    return projectRequest<ProjectTemplate[]>('/api/projects/templates')
  },

  applyTemplate(
    templateId: string,
    body: {
      freelancer_id: string
      title?: string
      company_id?: string | null
      deadline?: string | null
    }
  ) {
    return projectRequest<ProjectModuleSummary>(`/api/projects/templates/${templateId}/apply`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}
