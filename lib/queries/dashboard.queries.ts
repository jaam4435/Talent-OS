import { createRepositories } from '@/lib/repositories/factory'

export async function getManagerDashboard(tenantId: string) {
  const repos = await createRepositories()
  const [summary, companyCount] = await Promise.all([
    repos.dashboard.getSummary(tenantId),
    repos.company.countByTenant(tenantId),
  ])
  return { summary, companyCount }
}

export async function getClientDashboardContext(userId: string, tenantId: string) {
  const repos = await createRepositories()
  const companyId = await repos.tenantMember.findCompanyId(userId, tenantId)
  const company = companyId ? await repos.company.findById(companyId, tenantId) : null
  return { companyId, companyName: company?.name ?? null }
}

export async function getFreelancerDashboardContext(userId: string, tenantId: string) {
  const repos = await createRepositories()
  const freelancerId = await repos.talent.findIdByUserId(userId, tenantId)
  return { freelancerId }
}
