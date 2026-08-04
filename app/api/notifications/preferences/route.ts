import { withApiHandler } from '@/modules/core/api/handler'
import { createServices } from '@/lib/services/factory'
import { updatePreferencesSchema } from '@/modules/notifications/validation'

export const GET = withApiHandler({ auth: 'tenant', rateLimit: 'default' }, async ({ ctx }) => {
  const services = await createServices()
  const preferences = await services.notificationModule.getPreferences(ctx.tenant!.id, ctx.userId!)
  return { payload: preferences }
})

export const PATCH = withApiHandler(
  { auth: 'tenant', rateLimit: 'default', validate: { body: updatePreferencesSchema } },
  async ({ ctx, body }) => {
    const services = await createServices()
    const input = body as { preferences: Array<{ category: never; channel: never; enabled: boolean }> }
    const preferences = await services.notificationModule.updatePreferences(
      ctx.tenant!.id,
      ctx.userId!,
      input.preferences
    )
    return { payload: preferences }
  }
)
