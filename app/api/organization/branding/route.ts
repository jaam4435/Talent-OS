import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { updateBrandingSchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['tenant:read'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    const organization = await services.organization.getOrganization(ctx.tenant!.id)
    if (!organization) throw new AppError('NOT_FOUND', 'Organization not found', 404)
    return organization.branding
  }
)

export const PATCH = withApiHandler(
  {
    auth: 'admin',
    permissions: ['tenant:update'],
    rateLimit: 'default',
    validate: { body: updateBrandingSchema },
  },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.organization.updateBranding(
      ctx.tenant!.id,
      ctx.userId!,
      body as Parameters<typeof services.organization.updateBranding>[2]
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.branding
  }
)
