import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { updateOrganizationSchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['tenant:read'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    const organization = await services.organization.getOrganization(ctx.tenant!.id)
    if (!organization) throw new AppError('NOT_FOUND', 'Organization not found', 404)
    return organization
  }
)

export const PATCH = withApiHandler(
  {
    auth: 'admin',
    permissions: ['tenant:update'],
    rateLimit: 'default',
    validate: { body: updateOrganizationSchema },
  },
  async ({ ctx, body }) => {
    const services = await createServices()
    const result = await services.organization.updateOrganization(
      ctx.tenant!.id,
      ctx.userId!,
      body as Parameters<typeof services.organization.updateOrganization>[2]
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.organization
  }
)
