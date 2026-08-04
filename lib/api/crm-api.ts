import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import type {
  CrmActivity,
  CrmCompany,
  CrmContact,
  CrmContract,
  CrmDeal,
  CrmLead,
} from '@/modules/crm/types'

async function crmRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export const crmApi = {
  createLead(body: {
    title: string
    source?: string | null
    status?: string
    company_id?: string | null
    contact_id?: string | null
    value_estimate?: number | null
    currency?: string
    description?: string | null
  }) {
    return crmRequest<CrmLead>('/api/crm/leads', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  updateLead(
    id: string,
    body: Partial<{
      title: string
      source: string | null
      status: string
      company_id: string | null
      contact_id: string | null
      value_estimate: number | null
      currency: string
      description: string | null
    }>
  ) {
    return crmRequest<CrmLead>(`/api/crm/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  convertLead(
    id: string,
    body?: {
      create_company?: boolean
      company_name?: string
      create_deal?: boolean
      deal_title?: string
      deal_value?: number | null
      mark_client?: boolean
    }
  ) {
    return crmRequest<{
      lead: CrmLead
      companyId: string | null
      dealId: string | null
    }>(`/api/crm/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    })
  },

  updateCompany(
    id: string,
    body: Partial<{
      name: string
      contact_email: string | null
      contact_name: string | null
      website: string | null
      industry: string | null
      status: string
      notes: string | null
    }>
  ) {
    return crmRequest<CrmCompany>(`/api/crm/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  createContact(body: {
    company_id?: string | null
    first_name: string
    last_name?: string | null
    email?: string | null
    phone?: string | null
    job_title?: string | null
    is_primary?: boolean
  }) {
    return crmRequest<CrmContact>('/api/crm/contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  moveDealStage(id: string, stageId: string) {
    return crmRequest<CrmDeal>(`/api/crm/deals/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage_id: stageId }),
    })
  },

  createContract(body: {
    title: string
    deal_id?: string | null
    company_id?: string | null
    value?: number | null
    currency?: string
    status?: string
    starts_on?: string | null
    ends_on?: string | null
  }) {
    return crmRequest<CrmContract>('/api/crm/contracts', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  logActivity(body: {
    entity_type: string
    entity_id: string
    activity_type?: string
    subject: string
    description?: string | null
    occurred_at?: string
  }) {
    return crmRequest<CrmActivity>('/api/crm/activities', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}
