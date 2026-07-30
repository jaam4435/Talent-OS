import { requireTenant } from '@/modules/core/services/session'
import { requirePermission } from '@/modules/core/services/permissions'
import { AppError, handleApiError, success } from '@/modules/core/api/response'
import { getTalentMatchResults } from '@/lib/integrations/ai/matching'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ opportunityId: string }> }
) {
  try {
    const { tenant } = await requireTenant()
    requirePermission(tenant.role, 'ai:match')

    const { opportunityId } = await params
    const result = await getTalentMatchResults(opportunityId, tenant.id)

    return success(result)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return handleApiError(new AppError('UNAUTHORIZED', 'Authentication required', 401))
      }
      if (error.message.startsWith('FORBIDDEN')) {
        return handleApiError(new AppError('FORBIDDEN', 'Insufficient permissions', 403))
      }
    }
    return handleApiError(error)
  }
}
