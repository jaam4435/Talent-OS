import { createServices } from '@/lib/services/factory'

export async function getPaymentsForPage(tenantId: string, role: string, userId: string) {
  const services = await createServices()
  return services.finance.getPaymentsForPage(tenantId, role, userId)
}
