import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { listPaymentsQuerySchema } from '@/modules/finance/validation'
import type { PaymentStatus } from '@/modules/core/types/enums'

export const GET = withApiHandler(
  {
    auth: 'tenant',
    permissions: ['payments:read'],
    rateLimit: 'default',
    validate: { query: listPaymentsQuerySchema },
  },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.financeModule.listPayments(
      ctx.tenant!.id,
      ctx.tenant!.role,
      ctx.userId!,
      {
        page: Number(searchParams.get('page') ?? 1),
        limit: Number(searchParams.get('limit') ?? 50),
        status: (searchParams.get('status') as PaymentStatus | null) ?? undefined,
        freelancerId: searchParams.get('freelancer_id') ?? undefined,
        projectId: searchParams.get('project_id') ?? undefined,
      }
    )
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)
