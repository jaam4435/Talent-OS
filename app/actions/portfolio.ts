'use server'

import { revalidatePath } from 'next/cache'
import { requireTenant } from '@/modules/core/services/session'
import { catchToActionResult } from '@/modules/core/utils/result'
import { createTalentServices } from '@/lib/domains/talent/factory'
import type { PortfolioItemInput } from '@/lib/talent/types'

export async function addPortfolioItem(freelancerId: string, input: PortfolioItemInput) {
  const session = await requireTenant()
  const { portfolio } = await createTalentServices()

  try {
    await portfolio.assertAccess(freelancerId, session.tenant, session.user)
  } catch (error) {
    return catchToActionResult(error)
  }

  const result = await portfolio.addItem(freelancerId, input)
  if (!result.ok) {
    return result
  }

  revalidatePath(`/talent/${freelancerId}`)
  revalidatePath('/profile')
  return result
}

export async function deletePortfolioItem(freelancerId: string, itemId: string) {
  const session = await requireTenant()
  const { portfolio } = await createTalentServices()

  try {
    await portfolio.assertAccess(freelancerId, session.tenant, session.user)
  } catch (error) {
    return catchToActionResult(error)
  }

  const result = await portfolio.deleteItem(freelancerId, itemId)
  if (!result.ok) {
    return result
  }

  revalidatePath(`/talent/${freelancerId}`)
  revalidatePath('/profile')
  return result
}

export async function uploadPortfolioImage(freelancerId: string, formData: FormData) {
  const session = await requireTenant()
  const { portfolio } = await createTalentServices()

  let tenantId: string
  try {
    const access = await portfolio.assertAccess(freelancerId, session.tenant, session.user)
    tenantId = access.tenantId
  } catch (error) {
    return catchToActionResult(error)
  }

  return portfolio.uploadImage(freelancerId, tenantId, formData)
}
