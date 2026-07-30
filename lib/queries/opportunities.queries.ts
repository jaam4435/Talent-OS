import { createRepositories } from '@/lib/repositories/factory'
import type { Tables } from '@/modules/core/types/database'

export async function getOpportunitiesForPage(tenantId: string) {
  const repos = await createRepositories()
  const result = await repos.lead.listByTenant(tenantId)
  return result.data
}

export async function getOpportunityDetail(opportunityId: string, tenantId: string) {
  const repos = await createRepositories()
  return repos.lead.findById(opportunityId, tenantId)
}

export async function getOpportunityPageData(
  opportunityId: string,
  tenantId: string,
  userId: string,
  isManager: boolean
) {
  const repos = await createRepositories()
  const opportunity = await repos.lead.findById(opportunityId, tenantId)
  if (!opportunity) return null

  const recipients = await repos.lead.listRecipientsDetailed(opportunityId)
  const freelancerIds = recipients.map((r) => r.freelancer_id)

  const [freelancers, roster, ownFreelancerId] = await Promise.all([
    freelancerIds.length ? repos.talent.findByIds(freelancerIds, 'id, full_name, email') : [],
    isManager ? repos.talent.listBroadcastRoster(tenantId) : [],
    isManager ? null : repos.talent.findIdByUserId(userId, tenantId),
  ])

  const freelancerMap = new Map(freelancers.map((f) => [f.id as string, f]))
  const ownRecipient =
    !isManager && ownFreelancerId
      ? recipients.find((r) => r.freelancer_id === ownFreelancerId) ?? null
      : null

  return {
    opportunity: opportunity as Tables<'opportunities'>,
    recipients,
    freelancerMap,
    roster,
    ownRecipient,
    freelancerIds,
  }
}

export async function getShortlistPageHeader(opportunityId: string, tenantId: string) {
  const repos = await createRepositories()
  const [opportunity, interestedCount] = await Promise.all([
    repos.lead.findShortlistHeader(opportunityId, tenantId),
    repos.lead.countByResponse(opportunityId, 'interested'),
  ])
  return { opportunity, interestedCount }
}
