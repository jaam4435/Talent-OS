import { createServices } from '@/lib/services/factory'

export async function getManagerDashboard(tenantId: string) {
  const services = await createServices()
  return services.analytics.getManagerDashboard(tenantId)
}

export async function getClientDashboardContext(userId: string, tenantId: string) {
  const services = await createServices()
  return services.analytics.getClientDashboardContext(userId, tenantId)
}

export async function getFreelancerDashboardContext(userId: string, tenantId: string) {
  const services = await createServices()
  return services.analytics.getFreelancerDashboardContext(userId, tenantId)
}
