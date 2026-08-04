import { createServices } from '@/lib/services/factory'

export async function getFreelancerMatchInsights(freelancerId: string, tenantId: string) {
  const services = await createServices()
  return services.assignment.listMatchScoresByFreelancer(freelancerId, tenantId)
}
