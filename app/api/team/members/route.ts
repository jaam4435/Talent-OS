import { requireAdmin } from '@/modules/core/services/guards'
import { success, handleApiError } from '@/modules/core/api/response'
import { getTeamMembersPageData } from '@/lib/queries/team.queries'

export async function GET() {
  try {
    const { tenant } = await requireAdmin()
    const data = await getTeamMembersPageData(tenant.id)
    return success(data)
  } catch (error) {
    return handleApiError(error)
  }
}
