import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import type {
  NotificationItem,
  NotificationListMeta,
  NotificationPreference,
} from '@/modules/notifications/types'

async function notificationsRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

async function notificationsRequestWithMeta<T>(
  path: string,
  init?: RequestInit
): Promise<{ data: T; meta: NotificationListMeta }> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': 'v1',
      ...(init?.headers ?? {}),
    },
  })

  const json = (await response.json()) as ApiSuccess<T> | ApiErrorBody
  if (!response.ok || 'error' in json) {
    const err = json as ApiErrorBody
    throw new TalentOsApiError(
      err.error?.code ?? 'INTERNAL_ERROR',
      err.error?.message ?? 'Request failed',
      response.status,
      err.error?.details
    )
  }

  return {
    data: json.data,
    meta: (json.meta ?? {}) as NotificationListMeta,
  }
}

export const notificationsApi = {
  list(params?: { page?: number; limit?: number; unread_only?: boolean }) {
    const search = new URLSearchParams()
    if (params?.page) search.set('page', String(params.page))
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.unread_only) search.set('unread_only', 'true')
    const qs = search.toString()
    return notificationsRequestWithMeta<NotificationItem[]>(
      `/api/notifications${qs ? `?${qs}` : ''}`
    )
  },

  markRead(id: string) {
    return notificationsRequest<{ read: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    })
  },

  markAllRead() {
    return notificationsRequest<{ updated: number }>('/api/notifications/read-all', {
      method: 'POST',
    })
  },

  getPreferences() {
    return notificationsRequest<NotificationPreference[]>('/api/notifications/preferences')
  },

  updatePreferences(preferences: Array<{ category: string; channel: string; enabled: boolean }>) {
    return notificationsRequest<NotificationPreference[]>('/api/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ preferences }),
    })
  },
}
