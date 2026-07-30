import { NextResponse } from 'next/server'
import { requireTenant } from '@/modules/core/services/session'
import { requirePermission } from '@/modules/core/services/permissions'
import { AppError, handleApiError, success } from '@/modules/core/api/response'
import { requestTalentMatch } from '@/lib/integrations/ai/matching'

export async function POST(request: Request) {
  try {
    const { tenant, user } = await requireTenant()
    requirePermission(tenant.role, 'ai:match')

    const body = (await request.json()) as { opportunity_id?: string }
    if (!body.opportunity_id) {
      throw new AppError('VALIDATION_ERROR', 'opportunity_id is required', 400)
    }

    const result = await requestTalentMatch({
      tenantId: tenant.id,
      opportunityId: body.opportunity_id,
      actorId: user.id,
    })

    return success(result)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return handleApiError(new AppError('UNAUTHORIZED', 'Authentication required', 401))
      }
      if (error.message === 'NO_TENANT') {
        return handleApiError(new AppError('NO_TENANT', 'Tenant context required', 403))
      }
      if (error.message.startsWith('FORBIDDEN')) {
        return handleApiError(new AppError('FORBIDDEN', 'Insufficient permissions', 403))
      }
      if (error.message === 'AI_MATCHING_DISABLED') {
        return handleApiError(
          new AppError('AI_MATCHING_DISABLED', 'AI matching is disabled for this tenant', 403)
        )
      }
      if (error.message === 'AI_MONTHLY_LIMIT_EXCEEDED') {
        return handleApiError(
          new AppError('AI_MONTHLY_LIMIT_EXCEEDED', 'Monthly AI request limit exceeded', 429)
        )
      }
      if (error.message === 'OPPORTUNITY_NOT_FOUND') {
        return handleApiError(new AppError('NOT_FOUND', 'Opportunity not found', 404))
      }
    }
    return handleApiError(error)
  }
}
