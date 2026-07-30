'use server'

import { revalidatePath } from 'next/cache'
import { createServices } from '@/lib/services/factory'
import { requireManager } from '@/modules/core/services/guards'
import { requirePermission } from '@/modules/core/services/permissions'
import type { CreateKnowledgeEntryInput, KnowledgeSearchParams, UpdateKnowledgeEntryInput } from '@/modules/knowledge/types'

export async function createKnowledgeEntry(input: CreateKnowledgeEntryInput) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'tenant:read')

  const services = await createServices()
  const result = await services.knowledge.createEntry(tenant.id, user.id, input)

  if (result.ok) {
    revalidatePath('/knowledge')
  }

  return result
}

export async function updateKnowledgeEntry(
  entryId: string,
  input: UpdateKnowledgeEntryInput
) {
  const { tenant, user } = await requireManager()
  requirePermission(tenant.role, 'tenant:read')

  const services = await createServices()
  const result = await services.knowledge.updateEntry(entryId, tenant.id, user.id, input)

  if (result.ok) {
    revalidatePath('/knowledge')
    revalidatePath(`/knowledge/${entryId}`)
  }

  return result
}

export async function deleteKnowledgeEntry(entryId: string) {
  const { tenant } = await requireManager()
  requirePermission(tenant.role, 'tenant:read')

  const services = await createServices()
  const result = await services.knowledge.deleteEntry(entryId, tenant.id)

  if (result.ok) {
    revalidatePath('/knowledge')
  }

  return result
}

export async function searchKnowledgeAction(params: KnowledgeSearchParams) {
  const { tenant } = await requireManager()
  const services = await createServices()
  return services.knowledge.search(tenant.id, params)
}
