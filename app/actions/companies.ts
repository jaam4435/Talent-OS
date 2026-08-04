'use server'

/** @deprecated Use `/crm/companies` UI with `lib/api/crm-api.ts` instead of this Server Action. */
import { revalidatePath } from 'next/cache'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import { createServices } from '@/lib/services/factory'

export async function createCompany(input: {
  name: string
  contactEmail?: string
  contactName?: string
  website?: string
}) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'companies:create')

  const services = await createServices()
  const result = await services.crm.createCompany(tenant.id, input)

  if (!result.ok) {
    return { ok: false as const, error: result.error }
  }

  revalidatePath('/companies')
  return { ok: true as const, companyId: result.companyId }
}
