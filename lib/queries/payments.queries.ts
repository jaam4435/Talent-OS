import { createRepositories } from '@/lib/repositories/factory'

export async function getPaymentsForPage(tenantId: string, role: string, userId: string) {
  const repos = await createRepositories()

  let freelancerId: string | undefined
  if (role === 'freelancer') {
    freelancerId = (await repos.talent.findIdByUserId(userId, tenantId)) ?? undefined
  }

  const result = await repos.invoice.listByTenant(tenantId, { freelancerId })
  const freelancerIds = [...new Set(result.data.map((p) => p.freelancer_id))]
  const freelancers = await repos.talent.findNamesByIds(freelancerIds)
  const freelancerMap = new Map(freelancers.map((f) => [f.id, f]))

  return { payments: result.data, freelancerMap }
}
