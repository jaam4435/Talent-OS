import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'admin', permissions: ['tenant:billing'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    return services.organization.getSubscriptionReference(ctx.tenant!.id)
  }
)
