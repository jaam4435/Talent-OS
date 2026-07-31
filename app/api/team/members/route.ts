import { withApiHandler } from '@/modules/core/api/handler'
import { getTeamMembersPageData } from '@/lib/queries/team.queries'

export const GET = withApiHandler({ auth: 'admin', rateLimit: 'default' }, async ({ ctx }) => {
  return getTeamMembersPageData(ctx.tenant!.id)
})
