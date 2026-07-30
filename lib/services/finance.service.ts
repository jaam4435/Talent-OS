import type { Repositories } from '@/lib/repositories/factory'

export class FinanceService {
  constructor(private readonly repos: Repositories) {}

  async getPaymentsForPage(tenantId: string, role: string, userId: string) {
    let freelancerId: string | undefined
    if (role === 'freelancer') {
      freelancerId = (await this.repos.talent.findIdByUserId(userId, tenantId)) ?? undefined
    }

    const result = await this.repos.invoice.listByTenant(tenantId, { freelancerId })
    const freelancerIds = [...new Set(result.data.map((p) => p.freelancer_id))]
    const freelancers = await this.repos.talent.findNamesByIds(freelancerIds)
    const freelancerMap = new Map(freelancers.map((f) => [f.id, f]))

    return { payments: result.data, freelancerMap }
  }
}
