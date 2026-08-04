import type { Repositories } from '@/lib/repositories/factory'
import type { SearchResponse, SearchResult } from '@/modules/core/types/search'
import { rankSearchResults } from '@/modules/core/utils/search-ranking'
import { hasPermission, isManager } from '@/modules/core/services/permissions'
import type { UserRole } from '@/modules/core/types/enums'

const SEARCH_TIMEOUT_MS = 3000
const PER_TYPE_LIMIT = 5

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SEARCH_TIMEOUT')), ms)
    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

export class SearchService {
  constructor(private readonly repos: Repositories) {}

  async search(tenantId: string, role: UserRole, query: string): Promise<SearchResponse> {
    const startedAt = Date.now()
    const q = query.trim()

    if (q.length < 2) {
      return { query: q, results: [], tookMs: 0 }
    }

    const tasks: Promise<SearchResult[]>[] = []

    if (isManager(role) && hasPermission(role, 'freelancers:read')) {
      tasks.push(this.searchTalent(tenantId, q))
    }

    if (hasPermission(role, 'projects:read')) {
      tasks.push(this.searchProjects(tenantId, q))
    }

    if (hasPermission(role, 'crm:read')) {
      tasks.push(this.searchCompanies(tenantId, q))
      tasks.push(this.searchDeals(tenantId, q))
    } else if (hasPermission(role, 'companies:read')) {
      tasks.push(this.searchCompanies(tenantId, q))
    }

    let merged: SearchResult[] = []
    try {
      const groups = await withTimeout(Promise.all(tasks), SEARCH_TIMEOUT_MS)
      merged = groups.flat()
    } catch {
      merged = []
    }

    return {
      query: q,
      results: rankSearchResults(merged, q).slice(0, 20),
      tookMs: Date.now() - startedAt,
    }
  }

  private async searchTalent(tenantId: string, q: string): Promise<SearchResult[]> {
    const rows = await this.repos.talent.search(tenantId, {
      query: q,
      limit: PER_TYPE_LIMIT,
      offset: 0,
    })

    return rows.map((row) => ({
      id: row.id,
      type: 'talent' as const,
      title: row.full_name,
      subtitle: row.discipline ?? null,
      href: `/talent/${row.id}`,
      score: 0,
    }))
  }

  private async searchProjects(tenantId: string, q: string): Promise<SearchResult[]> {
    const result = await this.repos.project.listModule(
      tenantId,
      { q },
      { page: 1, limit: PER_TYPE_LIMIT }
    )

    return result.data.map((row) => ({
      id: row.id,
      type: 'project' as const,
      title: row.title,
      subtitle: row.status,
      href: `/projects/${row.id}`,
      score: 0,
    }))
  }

  private async searchCompanies(tenantId: string, q: string): Promise<SearchResult[]> {
    const result = await this.repos.crmCompany.list(tenantId, {
      page: 1,
      limit: PER_TYPE_LIMIT,
      q,
    })

    return result.data.map((row) => ({
      id: row.id,
      type: 'company' as const,
      title: row.name,
      subtitle: row.status,
      href: `/crm/companies/${row.id}`,
      score: 0,
    }))
  }

  private async searchDeals(tenantId: string, q: string): Promise<SearchResult[]> {
    const result = await this.repos.crmDeal.list(tenantId, {
      page: 1,
      limit: PER_TYPE_LIMIT,
      q,
    })

    return result.data.map((row) => ({
      id: row.id,
      type: 'deal' as const,
      title: row.title,
      subtitle: row.stageName ?? null,
      href: `/crm/deals/${row.id}`,
      score: 0,
    }))
  }
}
