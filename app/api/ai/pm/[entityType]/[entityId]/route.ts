import { requireTenant } from '@/modules/core/services/session'
import { requirePermission } from '@/modules/core/services/permissions'
import { AppError, handleApiError, success } from '@/modules/core/api/response'
import {
  getBriefParseResult,
  getProjectSummaryResult,
  getShortlistSummaryResult,
  getStatusAssessmentResult,
} from '@/lib/queries/ai.queries'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const { tenant } = await requireTenant()
    const { entityType, entityId } = await params

    if (entityType === 'project') {
      requirePermission(tenant.role, 'ai:summary')
      const [summary, status] = await Promise.all([
        getProjectSummaryResult(entityId, tenant.id),
        getStatusAssessmentResult(entityId, tenant.id),
      ])

      return success({
        summary: summary.summary,
        latestRequest: summary.latestRequest,
        assessment: status.assessment,
        statusRequest: status.latestRequest,
        currentStatus: status.currentStatus,
      })
    }

    if (entityType === 'opportunity') {
      requirePermission(tenant.role, 'ai:brief_parse')
      const [brief, shortlist] = await Promise.all([
        getBriefParseResult(entityId, tenant.id),
        getShortlistSummaryResult(entityId, tenant.id),
      ])

      return success({
        requirements: brief.requirements,
        latestRequest: brief.latestRequest,
        shortlistSummary: shortlist.latestRequest?.result ?? null,
        shortlistRequest: shortlist.latestRequest,
      })
    }

    throw new AppError('NOT_FOUND', 'Unknown entity type', 404)
  } catch (error) {
    return handleApiError(error)
  }
}
