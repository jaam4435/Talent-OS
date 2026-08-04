import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createAttachmentSchema } from '@/modules/crm/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['crm:read'], rateLimit: 'default' },
  async ({ ctx, searchParams }) => {
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')
    if (!entityType || !entityId) return []
    const services = await createServices()
    return services.crmDemand.listAttachments(ctx.tenant!.id, entityType, entityId)
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['crm:leads:manage'], rateLimit: 'default', validate: { body: createAttachmentSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    return services.crmDemand.createAttachment(ctx.tenant!.id, ctx.userId!, body as Record<string, unknown>)
  }
)
