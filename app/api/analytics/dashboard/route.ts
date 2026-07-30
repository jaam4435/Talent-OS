import { requireTenant } from '@/modules/core/services/session'
import { createRepositories } from '@/lib/repositories/factory'
import { success, handleApiError } from '@/modules/core/api/response'

export async function GET() {
  try {
    const { tenant } = await requireTenant()
    const repos = await createRepositories()
    const data = await repos.dashboard.getSummary(tenant.id)
    return success(data)
  } catch (err) {
    return handleApiError(err)
  }
}
