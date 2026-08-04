import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['assignment:read'], rateLimit: 'default' },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const conflicts = await services.assignmentModule.listOpenConflicts(
      ctx.tenant!.id,
      searchParams.get('freelancer_id') ?? undefined
    )
    return { payload: conflicts }
  }
)
