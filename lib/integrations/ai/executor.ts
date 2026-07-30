import { executeBriefParse } from '@/lib/integrations/ai/brief-parse'
import { executeTalentMatch } from '@/lib/integrations/ai/matching'
import {
  executeProjectSummary,
  executeShortlistSummary,
} from '@/lib/integrations/ai/summary'
import { executeStatusAssessment } from '@/lib/integrations/ai/status-assessment'
import { createAdminRepositories } from '@/lib/repositories/factory'

export async function executeAiRequest(aiRequestId: string, actorId?: string | null) {
  const repos = await createAdminRepositories()
  const requestType = await repos.aiRequest.findRequestType(aiRequestId)

  if (!requestType) {
    throw new Error('AI_REQUEST_NOT_FOUND')
  }

  switch (requestType) {
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
      throw new Error(`Unsupported AI request type: ${requestType}`)
  }
}
