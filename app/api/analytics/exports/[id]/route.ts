import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['analytics:export'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const record = await services.analyticsModule.getExport(ctx.tenant!.id, params.id as string)

    if (!record) {
      throw new AppError('NOT_FOUND', 'Export not found', 404)
    }

    if (record.status === 'expired' || new Date(record.expiresAt) < new Date()) {
      throw new AppError('EXPORT_EXPIRED', 'Export has expired', 410)
    }

    return { payload: record }
  }
)
