import { withApiHandler } from '@/modules/core/api/handler'

export const GET = withApiHandler({ auth: 'optional', rateLimit: 'auth' }, async ({ ctx }) => {
  return ctx.session
})
