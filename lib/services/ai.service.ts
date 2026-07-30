import { requestTalentMatch, getTalentMatchResults } from '@/lib/integrations/ai/matching'
import { parseBriefText, requestBriefParse, getBriefParseResult } from '@/lib/integrations/ai/brief-parse'
import {
  requestProjectSummary,
  requestShortlistSummary,
  getProjectSummaryResult,
  getShortlistSummaryResult,
} from '@/lib/integrations/ai/summary'
import {
  requestStatusAssessment,
  getStatusAssessmentResult,
} from '@/lib/integrations/ai/status-assessment'
import { executeAiRequest } from '@/lib/integrations/ai/executor'
import type { ParsedRequirements } from '@/lib/integrations/ai/types'

/** Orchestrates AI feature requests and result reads. Execution uses admin repos via integrations. */
export class AIService {
  async requestTalentMatch(input: {
    tenantId: string
    opportunityId: string
    actorId: string
    correlationId?: string
  }) {
    return requestTalentMatch(input)
  }

  async getTalentMatchResults(opportunityId: string, tenantId: string) {
    return getTalentMatchResults(opportunityId, tenantId)
  }

  async parseBriefText(input: {
    title: string
    description?: string | null
    budget?: number | null
    currency?: string
  }) {
    return parseBriefText(input)
  }

  async requestBriefParse(input: {
    tenantId: string
    opportunityId: string
    actorId: string
  }) {
    return requestBriefParse(input)
  }

  async getBriefParseResult(opportunityId: string, tenantId: string) {
    return getBriefParseResult(opportunityId, tenantId)
  }

  async requestProjectSummary(input: {
    tenantId: string
    projectId: string
    actorId: string
  }) {
    return requestProjectSummary(input)
  }

  async requestShortlistSummary(input: {
    tenantId: string
    opportunityId: string
    actorId: string
  }) {
    return requestShortlistSummary(input)
  }

  async getProjectSummaryResult(projectId: string, tenantId: string) {
    return getProjectSummaryResult(projectId, tenantId)
  }

  async getShortlistSummaryResult(opportunityId: string, tenantId: string) {
    return getShortlistSummaryResult(opportunityId, tenantId)
  }

  async requestStatusAssessment(input: {
    tenantId: string
    projectId: string
    actorId: string
  }) {
    return requestStatusAssessment(input)
  }

  async getStatusAssessmentResult(projectId: string, tenantId: string) {
    return getStatusAssessmentResult(projectId, tenantId)
  }

  async executeRequest(aiRequestId: string, actorId?: string | null) {
    return executeAiRequest(aiRequestId, actorId)
  }
}

export type { ParsedRequirements }
