import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import { ApiErrorCodes } from '@/modules/core/api/errors'

export const API_BASE_PATH = '/api'
export const DEFAULT_API_VERSION = 'v1'

export interface TalentOsClientOptions {
  baseUrl?: string
  /** Session cookies handled automatically in browser; pass headers for server-side use. */
  headers?: Record<string, string>
  apiVersion?: string
}

export class TalentOsApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'TalentOsApiError'
  }
}

export class TalentOsClient {
  private readonly baseUrl: string
  private readonly headers: Record<string, string>

  constructor(options: TalentOsClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? ''
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Version': options.apiVersion ?? DEFAULT_API_VERSION,
      ...options.headers,
    }
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown
      idempotencyKey?: string
      correlationId?: string
    }
  ): Promise<ApiSuccess<T>> {
    const headers = { ...this.headers }
    if (options?.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
    if (options?.correlationId) headers['X-Correlation-ID'] = options.correlationId

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

    const json = (await response.json()) as ApiResponse<T>

    if (!response.ok || 'error' in json) {
      const err = json as ApiErrorBody
      throw new TalentOsApiError(
        err.error?.code ?? ApiErrorCodes.INTERNAL_ERROR,
        err.error?.message ?? 'Request failed',
        response.status,
        err.error?.details
      )
    }

    return json as ApiSuccess<T>
  }

  health() {
    return this.request<{ ok: boolean; service: string; supabase: boolean; timestamp: string }>(
      'GET',
      '/api/health'
    )
  }

  getSession() {
    return this.request<unknown>('GET', '/api/auth/session')
  }

  getInvitePreview(token: string) {
    return this.request<{
      inviteId: string
      tenantId: string
      tenantName: string
      email: string
      role: string
      roleLabel: string
      expiresAt: string
      isValid: boolean
    }>('GET', `/api/auth/invite/${token}`)
  }

  searchTalent(params: Record<string, string | number | undefined>) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value))
    }
    return this.request<unknown[]>('GET', `/api/talent/search?${query}`)
  }

  requestTalentMatch(opportunityId: string, idempotencyKey?: string) {
    return this.request<unknown>(
      'POST',
      '/api/ai/match',
      { body: { opportunity_id: opportunityId }, idempotencyKey }
    )
  }

  getTalentMatchResults(opportunityId: string) {
    return this.request<unknown>('GET', `/api/ai/match/${opportunityId}`)
  }

  getAiPmResults(entityType: 'project' | 'opportunity', entityId: string) {
    return this.request<unknown>('GET', `/api/ai/pm/${entityType}/${entityId}`)
  }

  getDashboardAnalytics() {
    return this.request<unknown>('GET', '/api/analytics/dashboard')
  }

  getTeamMembers() {
    return this.request<unknown>('GET', '/api/team/members')
  }
}

export function createTalentOsClient(options?: TalentOsClientOptions) {
  return new TalentOsClient(options)
}
