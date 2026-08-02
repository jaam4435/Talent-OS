import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { updateCompanySchema } from '@/modules/crm/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const company = await services.crmDemand.getCompany(ctx.tenant!.id, params!.id)
    if (!company) throw new AppError('NOT_FOUND', 'Company not found', 404)
    return company
  }
)

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['companies:update'], rateLimit: 'default', validate: { body: updateCompanySchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.crmDemand.updateCompany(ctx.tenant!.id, ctx.userId!, params!.id, body as never)
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 404)
    return result.company
  }
)
