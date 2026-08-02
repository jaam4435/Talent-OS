'use server'

/**
 * @deprecated Use `/api/finance/payments/*` REST endpoints via `financeApi` instead.
 * Retained for backward compatibility until Sprint 24 cleanup.
 */
import { revalidatePath } from 'next/cache'
import { requireTenant } from '@/modules/core/services/session'
import { requirePermission } from '@/modules/core/services/permissions'
import { createServices } from '@/lib/services/factory'

/** @deprecated Prefer `POST /api/finance/payments/{id}/approve` */
export async function approvePayment(paymentId: string, notes?: string) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'payments:approve')

  const services = await createServices()
  const result = await services.finance.approvePayment(tenant.id, paymentId, user.id, notes)

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath('/payments')
  return { ok: true as const }
}

/** @deprecated Prefer `POST /api/finance/payments/{id}/mark-paid` */
export async function markPaymentPaid(paymentId: string, reference: string) {
  const { tenant, user } = await requireTenant()
  requirePermission(tenant.role, 'payments:pay')

  const trimmed = reference.trim()
  if (!trimmed) {
    return { ok: false as const, error: 'Payment reference is required' }
  }

  const services = await createServices()
  const result = await services.finance.markPaymentPaid(tenant.id, paymentId, trimmed, user.id)

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath('/payments')
  return { ok: true as const }
}
