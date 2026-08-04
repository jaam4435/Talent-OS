import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'

async function workflowRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export const workflowApi = {
  resolveApproval(id: string, body: { decision: 'approved' | 'rejected'; note?: string | null }) {
    return workflowRequest<{ ok: boolean }>(`/api/workflows/approvals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  retryJobs(jobIds: string[]) {
    return workflowRequest<{ retried: number }>('/api/workflows/retries/jobs', {
      method: 'POST',
      body: JSON.stringify({ job_ids: jobIds }),
    })
  },

  retryCompensations(compensationIds: string[]) {
    return workflowRequest<{ retried: number }>('/api/workflows/compensations/retry', {
      method: 'POST',
      body: JSON.stringify({ compensation_ids: compensationIds }),
    })
  },
}
