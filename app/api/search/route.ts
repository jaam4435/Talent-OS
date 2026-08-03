import { z } from 'zod'
import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

const searchQuerySchema = z.object({
  q: z.string().min(2).max(120),
})

export const GET = withApiHandler(
  {
    auth: 'tenant',
    rateLimit: 'search',
    validate: { query: searchQuerySchema },
  },
  async ({ ctx, searchParams }) => {
    const q = searchParams.get('q')!
    const services = await createServices()
    const result = await services.search.search(ctx.tenant!.id, ctx.tenant!.role, q)
    return { payload: result }
  }
)
