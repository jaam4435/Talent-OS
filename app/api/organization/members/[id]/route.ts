import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { updateMemberSchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

async function resolveActorMemberId(services: Awaited<ReturnType<typeof createServices>>, tenantId: string, userId: string) {
  const members = await services.organization.listMembers(tenantId, { limit: 100 })
  return members.data.find((m) => m.userId === userId)?.id
}

export const GET = withApiHandler(
  { auth: 'admin', permissions: ['members:manage'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const member = await services.organization.getMember(ctx.tenant!.id, params!.id)
    if (!member) throw new AppError('NOT_FOUND', 'Member not found', 404)
    return member
  }
)

export const PATCH = withApiHandler(
  {
    auth: 'admin',
    permissions: ['members:manage'],
    rateLimit: 'default',
    validate: { body: updateMemberSchema },
  },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const actorMemberId = await resolveActorMemberId(services, ctx.tenant!.id, ctx.userId!)
    const result = await services.organization.updateMember(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Parameters<typeof services.organization.updateMember>[3],
      actorMemberId
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return result.member
  }
)

export const DELETE = withApiHandler(
  { auth: 'admin', permissions: ['members:manage'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const actorMemberId = await resolveActorMemberId(services, ctx.tenant!.id, ctx.userId!)
    const result = await services.organization.removeMember(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      actorMemberId
    )
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { removed: true }
  }
)
