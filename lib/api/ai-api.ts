import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'

async function aiRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export const aiApi = {
  runTalentMatch(opportunityId: string) {
    return aiRequest<{ aiRequestId: string }>('/api/ai/match', {
      method: 'POST',
      body: JSON.stringify({ opportunity_id: opportunityId }),
    })
  },

  getTalentMatch(opportunityId: string) {
    return aiRequest<{ scores: unknown[]; latestRequest: unknown | null }>(
      `/api/ai/match/${opportunityId}`
    )
  },
}
