import { executeBriefParse } from '@/lib/integrations/ai/brief-parse'
import { executeTalentMatch } from '@/lib/integrations/ai/matching'
import {
  executeProjectSummary,
  executeShortlistSummary,
} from '@/lib/integrations/ai/summary'
import { executeStatusAssessment } from '@/lib/integrations/ai/status-assessment'
import { createAdminClient } from '@/modules/core/utils/supabase/admin'

export async function executeAiRequest(aiRequestId: string, actorId?: string | null) {
  const supabase = createAdminClient()
  const { data: aiRequest } = await supabase
    .from('ai_requests')
    .select('request_type')
    .eq('id', aiRequestId)
    .maybeSingle()

  if (!aiRequest) {
    throw new Error('AI_REQUEST_NOT_FOUND')
  }

  switch (aiRequest.request_type) {
    case 'talent_match':
      return executeTalentMatch(aiRequestId, actorId)
    case 'brief_parse':
      return executeBriefParse(aiRequestId)
    case 'project_summary':
      return executeProjectSummary(aiRequestId)
    case 'shortlist_summary':
      return executeShortlistSummary(aiRequestId)
    case 'status_assessment':
      return executeStatusAssessment(aiRequestId, actorId)
    default:
      throw new Error(`Unsupported AI request type: ${aiRequest.request_type}`)
  }
}
