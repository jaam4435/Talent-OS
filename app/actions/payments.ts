'use server'

import { revalidatePath } from 'next/cache'
import { createServices } from '@/lib/services/factory'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'

export async function approvePayment(input: { paymentId: string; notes?: string }) {
  const { tenant, user } = await requireTenant()

  if (!isManager(tenant.role)) {
    return { ok: false as const, error: 'Forbidden' }
  }

  const services = await createServices()
  const result = await services.finance.approvePayment(tenant.id, user.id, input)

  if (result.ok) {
    revalidatePath('/payments')
  }

  return result
}

export async function markPaymentPaid(input: { paymentId: string; paymentReference: string }) {
  const { tenant, user } = await requireTenant()

  if (!isManager(tenant.role)) {
    return { ok: false as const, error: 'Forbidden' }
  }

  const services = await createServices()
  const result = await services.finance.markPaymentPaid(tenant.id, user.id, input)

  if (result.ok) {
    revalidatePath('/payments')
  }

  return result
}
