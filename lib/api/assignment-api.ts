import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import type {
  AssignmentAllocation,
  AssignmentCapacity,
  AssignmentConflict,
  AssignmentConflictCheck,
  AssignmentRequirement,
  AssignmentSchedule,
  AssignmentSuggestion,
} from '@/modules/assignment/types'

async function assignmentRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export const assignmentApi = {
  createAllocation(body: {
    freelancer_id: string
    project_id?: string | null
    opportunity_id?: string | null
    title: string
    status?: string
    allocation_pct?: number
    starts_at: string
    ends_at: string
    notes?: string | null
    skip_conflict_check?: boolean
  }) {
    return assignmentRequest<AssignmentAllocation>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateAllocation(
    id: string,
    body: Partial<{
      freelancer_id: string
      project_id: string | null
      opportunity_id: string | null
      title: string
      status: string
      allocation_pct: number
      starts_at: string
      ends_at: string
      notes: string | null
      skip_conflict_check: boolean
    }>
  ) {
    return assignmentRequest<AssignmentAllocation>(`/api/assignments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  cancelAllocation(id: string) {
    return assignmentRequest<{ canceled: boolean }>(`/api/assignments/${id}`, {
      method: 'DELETE',
    })
  },

  checkConflicts(body: {
    freelancer_id: string
    starts_at: string
    ends_at: string
    allocation_pct?: number
    exclude_allocation_id?: string
  }) {
    return assignmentRequest<AssignmentConflictCheck[]>('/api/assignments/conflicts/check', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  resolveConflict(id: string) {
    return assignmentRequest<AssignmentConflict>(`/api/assignments/conflicts/${id}/resolve`, {
      method: 'PATCH',
    })
  },

  suggestCandidates(body: {
    required_skills?: string[]
    starts_at?: string
    ends_at?: string
    limit?: number
  }) {
    return assignmentRequest<AssignmentSuggestion[]>('/api/assignments/suggest', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  setCapacity(body: {
    freelancer_id: string
    weekly_hours?: number
    max_concurrent_assignments?: number
    effective_from?: string
    effective_to?: string | null
  }) {
    return assignmentRequest<AssignmentCapacity>('/api/assignments/capacity', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  addSchedule(
    allocationId: string,
    body: {
      starts_at: string
      ends_at: string
      hours?: number
      notes?: string | null
    }
  ) {
    return assignmentRequest<AssignmentSchedule>(`/api/assignments/${allocationId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  addRequirement(
    allocationId: string,
    body: {
      required_skills: string[]
      min_hours?: number | null
      description?: string | null
    }
  ) {
    return assignmentRequest<AssignmentRequirement>(`/api/assignments/${allocationId}/requirements`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}
