import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'

export const GET = withApiHandler(
  { auth: 'tenant', permissions: ['tenant:read'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    return services.organization.getAllRolePermissions()
  }
)
