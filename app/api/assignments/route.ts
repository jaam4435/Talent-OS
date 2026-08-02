import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createAllocationSchema, listQuerySchema } from '@/modules/assignment/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['assignment:read'], rateLimit: 'default', validate: { query: listQuerySchema } },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const result = await services.assignmentModule.listAllocations(ctx.tenant!.id, {
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      status: searchParams.get('status') ?? undefined,
      freelancerId: searchParams.get('freelancer_id') ?? undefined,
      projectId: searchParams.get('project_id') ?? undefined,
      opportunityId: searchParams.get('opportunity_id') ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['assignment:manage'], rateLimit: 'default', validate: { body: createAllocationSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.assignmentModule.createAllocation(
      ctx.tenant!.id,
      ctx.userId!,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400, { conflicts: result.conflicts })
    return { payload: result.allocation, meta: { conflicts: result.conflicts } }
  }
)
