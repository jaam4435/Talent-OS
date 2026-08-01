import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { updateTeamSchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['org:teams:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const team = await services.organization.getTeam(ctx.tenant!.id, params!.id)
    if (!team) throw new AppError('NOT_FOUND', 'Team not found', 404)
    return team
  }
)

export const PATCH = withApiHandler(
  {
    auth: 'manager',
    permissions: ['org:teams:manage'],
    rateLimit: 'default',
    validate: { body: updateTeamSchema },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.organization.updateTeam(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Parameters<typeof services.organization.updateTeam>[3]
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.team
  }
)

export const DELETE = withApiHandler(
  { auth: 'manager', permissions: ['org:teams:manage'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const result = await services.organization.deleteTeam(ctx.tenant!.id, ctx.userId!, params!.id)
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { deleted: true }
  }
)
