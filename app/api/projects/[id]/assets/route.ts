import { withApiHandler } from '@/modules/core/api/handler'
import { AppError } from '@/modules/core/api/response'
import { createServices } from '@/lib/services/factory'
import { createAssetSchema } from '@/modules/project/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['project:read'], rateLimit: 'default' },
  async ({ ctx, params }) => {
    const services = await createServices()
    const assets = await services.projectModule.listAssets(ctx.tenant!.id, params!.id)
    return { payload: assets }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['project:manage'], rateLimit: 'default', validate: { body: createAssetSchema } },
  async ({ ctx, params, body }) => {
    const services = await createServices()
    const result = await services.projectModule.createAsset(
      ctx.tenant!.id,
      ctx.userId!,
      params!.id,
      body as Record<string, unknown>
    )
    if (!result.ok) throw new AppError('NOT_FOUND', result.error, 404)
    return { payload: result.asset }
  }
)
