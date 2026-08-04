import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { teamMemberSchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['org:teams:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const memberIds = await services.organization.listTeamMembers(ctx.tenant!.id, params!.id)
    return { member_ids: memberIds }
  }
)

export const POST = withApiHandler(
  {
    auth: 'manager',
    permissions: ['org:teams:manage'],
    rateLimit: 'default',
    validate: { body: teamMemberSchema },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const payload = body as { member_id: string }
    const result = await services.organization.addTeamMember(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      payload.member_id
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { added: true }
  }
)

export const DELETE = withApiHandler(
  {
    auth: 'manager',
    permissions: ['org:teams:manage'],
    rateLimit: 'default',
    validate: { query: teamMemberSchema },
  },
  async ({ ctx, params, searchParams }) => {
    const memberId = searchParams.get('member_id')
    if (!memberId) throw new AppError('VALIDATION_ERROR', 'member_id query param is required', 400)

    const services = await createServices()
    const result = await services.organization.removeTeamMember(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      memberId
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { removed: true }
  }
)
