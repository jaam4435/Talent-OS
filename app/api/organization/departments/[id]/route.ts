import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { updateDepartmentSchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['org:departments:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const department = await services.organization.getDepartment(ctx.tenant!.id, params!.id)
    if (!department) throw new AppError('NOT_FOUND', 'Department not found', 404)
    return department
  }
)

export const PATCH = withApiHandler(
  {
    auth: 'manager',
    permissions: ['org:departments:manage'],
    rateLimit: 'default',
    validate: { body: updateDepartmentSchema },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.organization.updateDepartment(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Parameters<typeof services.organization.updateDepartment>[3]
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.department
  }
)

export const DELETE = withApiHandler(
  { auth: 'manager', permissions: ['org:departments:manage'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const result = await services.organization.deleteDepartment(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { deleted: true }
  }
)
