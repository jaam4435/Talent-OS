import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import type {
  OrganizationBranding,
  OrganizationDepartment,
  OrganizationInvite,
  OrganizationMember,
  OrganizationSummary,
  OrganizationTeam,
} from '@/modules/organization/types'
import type { MemberStatus, UserRole } from '@/modules/core/types/enums'

async function organizationRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export const organizationApi = {
  updateOrganization(body: {
    name?: string
    timezone?: string
    currency?: string
  }) {
    return organizationRequest<OrganizationSummary>('/api/organization', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  updateBranding(body: {
    logo_url?: string | null
    primary_color?: string | null
    accent_color?: string | null
  }) {
    return organizationRequest<OrganizationBranding>('/api/organization/branding', {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  createDepartment(body: { name: string; description?: string | null }) {
    return organizationRequest<OrganizationDepartment>('/api/organization/departments', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  deleteDepartment(id: string) {
    return organizationRequest<{ deleted: boolean }>(`/api/organization/departments/${id}`, {
      method: 'DELETE',
    })
  },

  createTeam(body: {
    name: string
    description?: string | null
    department_id?: string | null
  }) {
    return organizationRequest<OrganizationTeam>('/api/organization/teams', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  deleteTeam(id: string) {
    return organizationRequest<{ deleted: boolean }>(`/api/organization/teams/${id}`, {
      method: 'DELETE',
    })
  },

  addTeamMember(teamId: string, memberId: string) {
    return organizationRequest<{ added: boolean }>(`/api/organization/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId }),
    })
  },

  removeTeamMember(teamId: string, memberId: string) {
    return organizationRequest<{ removed: boolean }>(
      `/api/organization/teams/${teamId}/members?member_id=${encodeURIComponent(memberId)}`,
      { method: 'DELETE' }
    )
  },

  updateMember(id: string, body: { role?: UserRole; status?: MemberStatus }) {
    return organizationRequest<OrganizationMember>(`/api/organization/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  removeMember(id: string) {
    return organizationRequest<{ removed: boolean }>(`/api/organization/members/${id}`, {
      method: 'DELETE',
    })
  },

  createInvite(body: { email: string; role: UserRole; company_id?: string }) {
    return organizationRequest<{ invite: OrganizationInvite; invite_url: string }>(
      '/api/organization/invitations',
      { method: 'POST', body: JSON.stringify(body) }
    )
  },

  revokeInvite(id: string) {
    return organizationRequest<{ revoked: boolean }>(`/api/organization/invitations/${id}`, {
      method: 'DELETE',
    })
  },
}
