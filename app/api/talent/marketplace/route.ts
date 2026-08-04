import { withApiHandler } from '@/modules/core/api/handler'
import { createAdminServices } from '@/lib/services/factory'
import { assertMarketplaceEnabled } from '@/lib/platform/marketplace-guard'
import { marketplaceListQuerySchema } from '@/modules/talent/validation'
import { AppError } from '@/modules/core/api/response'

export const GET = withApiHandler(
  { auth: 'none', rateLimit: 'default', validate: { query: marketplaceListQuerySchema } },
  async ({ searchParams }) => {
    await assertMarketplaceEnabled()

    const services = await createAdminServices()
    const result = await services.talentModule.listMarketplaceProfiles({
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 20),
      q: searchParams.get('q') ?? undefined,
      discipline: searchParams.get('discipline') ?? undefined,
      availability: searchParams.get('availability') ?? undefined,
    })

    return {
      payload: result.data,
      meta: { page: result.page, limit: result.limit, total: result.total, hasMore: result.hasMore },
    }
  }
)

export const POST = withApiHandler({ auth: 'none' }, async () => {
  await assertMarketplaceEnabled()
  throw new AppError('NOT_FOUND', 'Not found', 404)
})
