import { withApiHandler } from '@/modules/core/api/handler'

export const GET = withApiHandler({ auth: 'manager', rateLimit: 'default' }, async ({ ctx, searchParams }) => {
  const { createServices } = await import('@/lib/services/factory')
  const services = await createServices()
  const status = searchParams.get('status') as 'open' | 'acknowledged' | 'resolved' | null

  return services.observability.listAlerts(
    ctx.tenant!.id,
    status ?? undefined
  )
})
