import { createRepositories } from '@/lib/repositories/factory'
import type { ShortlistItemView } from '@/lib/shortlists/queries'

export async function listCompanies(tenantId: string) {
  const repos = await createRepositories()
  return repos.company.listByTenant(tenantId)
}

export async function getCompanyById(companyId: string, tenantId: string) {
  const repos = await createRepositories()
  return repos.company.findById(companyId, tenantId)
}

export async function getShortlistItems(
  opportunityId: string,
  tenantId: string
): Promise<{ shortlistId: string | null; items: ShortlistItemView[] }> {
  const repos = await createRepositories()

  const shortlist = await repos.shortlist.findByOpportunity(opportunityId, tenantId)
  if (!shortlist) {
    return { shortlistId: null, items: [] }
  }

  const items = await repos.shortlist.listActiveItems(shortlist.id)
  const freelancerIds = items.map((i) => i.freelancer_id)

  const [freelancers, scores, recipients] = await Promise.all([
    repos.talent.findByIds(freelancerIds),
    repos.matchScore.findByOpportunity(opportunityId),
    repos.lead.listRecipientsByOpportunity(opportunityId),
  ])

  const freelancerMap = new Map(freelancers.map((f) => [f.id as string, f]))
  const scoreMap = new Map(scores.map((s) => [s.freelancer_id, s.score]))
  const responseMap = new Map(recipients.map((r) => [r.freelancer_id, r.response]))

  const views: ShortlistItemView[] = items
    .map((item) => {
      const freelancer = freelancerMap.get(item.freelancer_id)
      if (!freelancer) return null

      return {
        id: item.id,
        freelancerId: item.freelancer_id,
        rank: item.rank,
        notes: item.notes,
        status: item.status,
        rejectionReason: item.rejection_reason,
        freelancer: {
          id: freelancer.id as string,
          full_name: freelancer.full_name as string,
          email: freelancer.email as string,
          discipline: freelancer.discipline as string,
          day_rate: freelancer.day_rate as number | null,
          currency: freelancer.currency as string,
          availability: freelancer.availability as string,
          internal_rating: freelancer.internal_rating as number | null,
        },
        matchScore: scoreMap.get(item.freelancer_id) ?? null,
        response: responseMap.get(item.freelancer_id) ?? null,
      }
    })
    .filter((item): item is ShortlistItemView => item !== null)

  return { shortlistId: shortlist.id, items: views }
}

export async function getOrCreateShortlist(
  opportunityId: string,
  tenantId: string,
  createdBy: string
): Promise<string> {
  const repos = await createRepositories()
  return repos.shortlist.getOrCreate(opportunityId, tenantId, createdBy)
}
