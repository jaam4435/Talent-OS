import { requireTenant } from '@/modules/core/services/session'
import { createServices } from '@/lib/services/factory'
import { success, handleApiError } from '@/modules/core/api/response'

export async function GET() {
  try {
    const { tenant } = await requireTenant()
    const services = await createServices()
    const data = await services.analytics.getDashboardSummary(tenant.id)
    return success(data)
  } catch (err) {
    return handleApiError(err)
  }
}
