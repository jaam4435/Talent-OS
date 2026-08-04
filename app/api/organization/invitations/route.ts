import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createInviteSchema, listQuerySchema } from '@/modules/organization/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  {
    auth: 'admin',
    permissions: ['members:invite'],
    rateLimit: 'default',
    validate: { query: listQuerySchema },
  },
  async ({ ctx, searchParams }) => {
    const services = await createServices()
    const page = Number(searchParams.get('page') ?? 1)
    const limit = Number(searchParams.get('limit') ?? 20)
    const q = searchParams.get('q') ?? undefined
    const result = await services.organization.listInvites(ctx.tenant!.id, { page, limit, q })
    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)

export const POST = withApiHandler(
  {
    auth: 'admin',
    permissions: ['members:invite'],
    rateLimit: 'default',
    idempotency: true,
    validate: { body: createInviteSchema },
  },
  async ({ ctx, body }) => {
    const services = await createServices()
    const payload = body as { email: string; role: Parameters<typeof services.organization.createInvite>[2]['role']; company_id?: string }
    const result = await services.organization.createInvite(ctx.tenant!.id, ctx.userId!, {
      email: payload.email,
      role: payload.role,
      companyId: payload.company_id,
    })
    if (!result.ok) throw new AppError('VALIDATION_ERROR', result.error, 400)
    return { invite: result.invite, invite_url: result.inviteUrl }
  }
)
