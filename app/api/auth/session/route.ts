import { withApiHandler } from '@/modules/core/api/handler'

export const GET = withApiHandler({ auth: 'optional' }, async ({ ctx }) => {
  return ctx.session
})
