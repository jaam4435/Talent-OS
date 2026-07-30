import { withApiHandler } from '@/modules/core/api/handler'

export const GET = withApiHandler({ auth: 'manager', rateLimit: 'default' }, async ({ ctx, searchParams }) => {
  const { createServices } = await import('@/lib/services/factory')
  const services = await createServices()

  return services.observability.listLogs(ctx.tenant!.id, {
    level: searchParams.get('level') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    limit: searchParams.get('limit') ? Number(searchParams.get('limit')) : 100,
  })
})
