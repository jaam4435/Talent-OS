'use server'

import { revalidatePath } from 'next/cache'
import { requireTenant } from '@/modules/core/services/session'
import { catchToActionResult } from '@/modules/core/utils/result'
import { createServices } from '@/lib/services/factory'
import type { PortfolioItemInput } from '@/lib/domains/talent/types'

export async function addPortfolioItem(freelancerId: string, input: PortfolioItemInput) {
  const session = await requireTenant()
  const services = await createServices()

  try {
    await services.portfolio.assertAccess(freelancerId, session.tenant, session.user)
  } catch (error) {
    return catchToActionResult(error)
  }

  const result = await services.portfolio.addItem(freelancerId, input)
  if (!result.ok) {
    return result
  }

  revalidatePath(`/talent/${freelancerId}`)
  revalidatePath('/profile')
  return result
}

export async function deletePortfolioItem(freelancerId: string, itemId: string) {
  const session = await requireTenant()
  const services = await createServices()

  try {
    await services.portfolio.assertAccess(freelancerId, session.tenant, session.user)
  } catch (error) {
    return catchToActionResult(error)
  }

  const result = await services.portfolio.deleteItem(freelancerId, itemId)
  if (!result.ok) {
    return result
  }

  revalidatePath(`/talent/${freelancerId}`)
  revalidatePath('/profile')
  return result
}

export async function uploadPortfolioImage(freelancerId: string, formData: FormData) {
  const session = await requireTenant()
  const services = await createServices()

  let tenantId: string
  try {
    const access = await services.portfolio.assertAccess(
      freelancerId,
      session.tenant,
      session.user
    )
    tenantId = access.tenantId
  } catch (error) {
    return catchToActionResult(error)
  }

  return services.portfolio.uploadImage(freelancerId, tenantId, formData)
}
