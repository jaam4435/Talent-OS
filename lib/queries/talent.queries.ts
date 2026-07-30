import { createRepositories } from '@/lib/repositories/factory'
import type { Tables } from '@/modules/core/types/database'

export type TalentRow = Tables<'freelancers'>

export async function getTalentName(freelancerId: string): Promise<string | null> {
  const repos = await createRepositories()
  return repos.talent.findNameById(freelancerId)
}

export async function getTalentProfile(
  freelancerId: string,
  tenantId: string
): Promise<TalentRow | null> {
  const repos = await createRepositories()
  return repos.talent.findById(freelancerId, tenantId)
}

export async function getTalentActivity(freelancerId: string, limit = 10) {
  const repos = await createRepositories()
  return repos.activityLog.listByEntity('freelancer', freelancerId, limit)
}

export async function searchTalentRoster(
  tenantId: string,
  params: {
    query?: string
    discipline?: string
    availability?: string
    minRate?: number
    maxRate?: number
    minRating?: number
    sort?: string
    limit?: number
    offset?: number
  }
) {
  const repos = await createRepositories()
  return repos.talent.search(tenantId, params)
}
