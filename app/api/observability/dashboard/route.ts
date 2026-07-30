import { withApiHandler } from '@/modules/core/api/handler'

export const GET = withApiHandler({ auth: 'manager', rateLimit: 'default' }, async ({ ctx }) => {
  const { createServices } = await import('@/lib/services/factory')
  const services = await createServices()
  return services.observability.getDashboard(ctx.tenant!.id)
})
