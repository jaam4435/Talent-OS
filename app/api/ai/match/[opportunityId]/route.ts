import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { getTalentMatchResults } from '@/lib/queries/ai.queries'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['ai:match'], rateLimit: 'ai' },
  async ({ ctx, params }) => {
    const opportunityId = params?.opportunityId
    if (!opportunityId) {
      throw new AppError('VALIDATION_ERROR', 'opportunityId is required', 400)
    }
    return getTalentMatchResults(opportunityId, ctx.tenant!.id)
  }
)
