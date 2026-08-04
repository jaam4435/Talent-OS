import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import type { FinancePayment, FinancePaymentDetail } from '@/modules/finance/types'

async function financeRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export const financeApi = {
  listPayments(params?: {
    page?: number
    limit?: number
    status?: string
    freelancer_id?: string
    project_id?: string
  }) {
    const search = new URLSearchParams()
    if (params?.page) search.set('page', String(params.page))
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.status) search.set('status', params.status)
    if (params?.freelancer_id) search.set('freelancer_id', params.freelancer_id)
    if (params?.project_id) search.set('project_id', params.project_id)
    const qs = search.toString()
    return financeRequest<FinancePayment[]>(`/api/finance/payments${qs ? `?${qs}` : ''}`)
  },

  getPayment(id: string) {
    return financeRequest<FinancePaymentDetail>(`/api/finance/payments/${id}`)
  },

  approvePayment(id: string, body?: { notes?: string }) {
    return financeRequest<FinancePayment>(`/api/finance/payments/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    })
  },

  markPaid(id: string, paymentReference: string) {
    return financeRequest<FinancePayment>(`/api/finance/payments/${id}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify({ payment_reference: paymentReference }),
    })
  },
}
