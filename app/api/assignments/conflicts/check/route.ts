import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { conflictCheckSchema } from '@/modules/assignment/validation'

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['assignment:read'], rateLimit: 'default', validate: { body: conflictCheckSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const input = body as {
      freelancer_id: string
      starts_at: string
      ends_at: string
      allocation_pct?: number
      exclude_allocation_id?: string
    }
    const conflicts = await services.assignmentModule.checkConflicts(ctx.tenant!.id, input)
    return { payload: conflicts }
  }
)
