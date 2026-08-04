import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import type {
  CreateKnowledgeEntryInput,
  KnowledgeEntryRow,
  KnowledgeSearchResult,
  UpdateKnowledgeEntryInput,
} from '@/modules/knowledge/types'

async function knowledgeRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export const knowledgeApi = {
  listEntries(params?: { page?: number; limit?: number; category?: string; q?: string }) {
    const search = new URLSearchParams()
    if (params?.page) search.set('page', String(params.page))
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.category) search.set('category', params.category)
    if (params?.q) search.set('q', params.q)
    const qs = search.toString()
    return knowledgeRequest<KnowledgeEntryRow[]>(`/api/knowledge/entries${qs ? `?${qs}` : ''}`)
  },

  getEntry(id: string) {
    return knowledgeRequest<{ entry: KnowledgeEntryRow; chunks: unknown[] }>(
      `/api/knowledge/entries/${id}`
    )
  },

  createEntry(body: CreateKnowledgeEntryInput) {
    return knowledgeRequest<{ id: string }>('/api/knowledge/entries', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateEntry(id: string, body: UpdateKnowledgeEntryInput) {
    return knowledgeRequest<{ entry: KnowledgeEntryRow; chunks: unknown[] }>(
      `/api/knowledge/entries/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    )
  },

  deleteEntry(id: string) {
    return knowledgeRequest<{ deleted: boolean }>(`/api/knowledge/entries/${id}`, {
      method: 'DELETE',
    })
  },

  search(body: { query: string; categories?: string[]; limit?: number }) {
    return knowledgeRequest<KnowledgeSearchResult[]>('/api/knowledge/search', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}
