import { createServices } from '@/lib/services/factory'
import type { KnowledgeCategory } from '@/modules/knowledge/types'

export async function getKnowledgeEntry(entryId: string, tenantId: string) {
  const services = await createServices()
  return services.knowledge.getEntry(entryId, tenantId)
}

export async function listKnowledgeByCategory(
  tenantId: string,
  category: KnowledgeCategory,
  page = 1,
  limit = 20
) {
  const services = await createServices()
  return services.knowledge.listByCategory(tenantId, category, {
    page,
    limit,
    offset: (page - 1) * limit,
  })
}

export async function listKnowledgeByProject(
  tenantId: string,
  projectId: string,
  page = 1,
  limit = 20
) {
  const services = await createServices()
  return services.knowledge.listByProject(tenantId, projectId, {
    page,
    limit,
    offset: (page - 1) * limit,
  })
}

export async function listKnowledgeByCompany(
  tenantId: string,
  companyId: string,
  page = 1,
  limit = 20
) {
  const services = await createServices()
  return services.knowledge.listByCompany(tenantId, companyId, {
    page,
    limit,
    offset: (page - 1) * limit,
  })
}

export async function searchKnowledge(
  tenantId: string,
  query: string,
  options?: {
    categories?: KnowledgeCategory[]
    entityType?: string
    entityId?: string
    limit?: number
  }
) {
  const services = await createServices()
  const result = await services.knowledge.search(tenantId, {
    query,
    categories: options?.categories,
    entityType: options?.entityType,
    entityId: options?.entityId,
    limit: options?.limit,
  })
  return result.ok ? result.results : []
}
