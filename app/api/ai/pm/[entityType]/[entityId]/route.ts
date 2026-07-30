import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import {
  getBriefParseResult,
  getProjectSummaryResult,
  getShortlistSummaryResult,
  getStatusAssessmentResult,
} from '@/lib/queries/ai.queries'

export const GET = withApiHandler(
  { auth: 'tenant', rateLimit: 'ai' },
  async ({ ctx, params }) => {
    const entityType = params?.entityType
    const entityId = params?.entityId

    if (!entityType || !entityId) {
      throw new AppError('VALIDATION_ERROR', 'entityType and entityId are required', 400)
    }

    if (entityType === 'project') {
      const { requirePermission } = await import('@/modules/core/services/permissions')
      requirePermission(ctx.tenant!.role, 'ai:summary')

      const [summary, status] = await Promise.all([
        getProjectSummaryResult(entityId, ctx.tenant!.id),
        getStatusAssessmentResult(entityId, ctx.tenant!.id),
      ])

      return {
        summary: summary.summary,
        latestRequest: summary.latestRequest,
        assessment: status.assessment,
        statusRequest: status.latestRequest,
        currentStatus: status.currentStatus,
      }
    }

    if (entityType === 'opportunity') {
      const { requirePermission } = await import('@/modules/core/services/permissions')
      requirePermission(ctx.tenant!.role, 'ai:brief_parse')

      const [brief, shortlist] = await Promise.all([
        getBriefParseResult(entityId, ctx.tenant!.id),
        getShortlistSummaryResult(entityId, ctx.tenant!.id),
      ])

      return {
        requirements: brief.requirements,
        latestRequest: brief.latestRequest,
        shortlistSummary: shortlist.latestRequest?.result ?? null,
        shortlistRequest: shortlist.latestRequest,
      }
    }

    throw new AppError('NOT_FOUND', 'Unknown entity type', 404)
  }
)
