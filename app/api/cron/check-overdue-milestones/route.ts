import { withApiHandler } from '@/modules/core/api/handler'
import { processOverdueMilestones } from '@/lib/integrations/ai/status-assessment'

export const GET = withApiHandler(
  { auth: 'cron', rateLimit: 'cron', legacyEnvelope: true },
  async () => processOverdueMilestones()
)
