import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { createTemplateSchema } from '@/modules/project/validation'

export const GET = withApiHandler(
  { auth: 'manager', permissions: ['project:read'], rateLimit: 'default' },
  async ({ ctx }) => {
    const services = await createServices()
    const templates = await services.projectModule.listTemplates(ctx.tenant!.id)
    return { payload: templates }
  }
)

export const POST = withApiHandler(
  { auth: 'manager', permissions: ['project:templates:manage'], rateLimit: 'default', validate: { body: createTemplateSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const template = await services.projectModule.createTemplate(
      ctx.tenant!.id,
      ctx.userId!,
      body as Record<string, unknown>
    )
    return { payload: template }
  }
)
