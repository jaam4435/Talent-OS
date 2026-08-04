import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { updateLeadSchema } from '@/modules/crm/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const lead = await services.crmDemand.getLead(ctx.tenant!.id, params!.id)
    if (!lead) throw new AppError('NOT_FOUND', 'Lead not found', 404)
    return lead
  }
)

export const PATCH = withApiHandler(
  { auth: 'manager', permissions: ['crm:leads:manage'], rateLimit: 'default', validate: { body: updateLeadSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.crmDemand.updateLead(ctx.tenant!.id, ctx.userId!, params!.id, body as Record<string, unknown>)
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.lead
  }
)
