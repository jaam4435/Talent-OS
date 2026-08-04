import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { updateBusinessHoursSchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['tenant:read'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    const organization = await services.organization.getOrganization(ctx.tenant!.id)
    if (!organization) throw new AppError('NOT_FOUND', 'Organization not found', 404)
    return {
      timezone: organization.settings.timezone,
      currency: organization.settings.currency,
      business_hours: organization.settings.businessHours,
    }
  }
)

export const PATCH = withApiHandler(
  {
    auth: 'admin',
    permissions: ['tenant:update'],
    rateLimit: 'default',
    validate: { body: updateBusinessHoursSchema },
  },
  async ({ ctx, body }) => {
    const services = await createServices()
    const payload = body as { business_hours: Parameters<typeof services.organization.updateBusinessHours>[2] }
    const result = await services.organization.updateBusinessHours(
      ctx.tenant!.id,
      ctx.userId!,
      payload.business_hours
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { updated: true }
  }
)
