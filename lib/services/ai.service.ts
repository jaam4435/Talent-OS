import type { Repositories } from '@/lib/repositories/factory'
import type { AiProvider, AiRequestType } from '@/lib/integrations/ai/types'
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

interface TenantAiSettings {
  aiMatchingEnabled: boolean
  aiPmEnabled: boolean
  maxAiRequestsMonthly: number
}

/** Orchestrates AI feature requests, governance, and result reads. */
export class AIService {
  constructor(private readonly repos: Repositories) {}

  async getTenantAiSettings(tenantId: string): Promise<TenantAiSettings> {
    return this.repos.tenant.getAiSettings(tenantId)
  }

  async assertAiFeatureAllowed(
    tenantId: string,
    feature: 'talent_match' | 'brief_parse' | 'project_summary' | 'shortlist_summary' | 'status_assessment'
  ): Promise<void> {
    const settings = await this.getTenantAiSettings(tenantId)

    if (feature === 'talent_match' && !settings.aiMatchingEnabled) {
      throw new Error('AI_MATCHING_DISABLED')
    }

    if (feature !== 'talent_match' && !settings.aiPmEnabled) {
      throw new Error('AI_PM_DISABLED')
    }

    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)

    const count = await this.repos.aiRequest.countMonthlyByTenant(tenantId, monthStart)
    if (count >= settings.maxAiRequestsMonthly) {
      throw new Error('AI_MONTHLY_LIMIT_EXCEEDED')
    }
  }

  async assertAiMatchingAllowed(tenantId: string): Promise<void> {
    await this.assertAiFeatureAllowed(tenantId, 'talent_match')
  }

  async createAiRequest(input: {
    tenantId: string
    correlationId?: string
    provider: AiProvider
    model: string
    requestType: AiRequestType | string
    entityType?: string
    entityId?: string
    promptHash?: string
  }): Promise<string> {
    return this.repos.aiRequest.create(input)
  }

  async updateAiRequest(
    aiRequestId: string,
    patch: {
      status?: 'processing' | 'completed' | 'failed'
      result?: Record<string, unknown> | null
      errorMessage?: string | null
      inputTokens?: number
      outputTokens?: number
      estimatedCost?: number
      durationMs?: number
      promptHash?: string
    }
  ): Promise<void> {
    await this.repos.aiRequest.update(aiRequestId, patch)
  }

  async findRequestType(aiRequestId: string): Promise<string | null> {
    return this.repos.aiRequest.findRequestType(aiRequestId)
  }

  async findById(aiRequestId: string) {
    return this.repos.aiRequest.findById(aiRequestId)
  }

  async findLatestByEntity(input: {
    tenantId: string
    entityType: string
    entityId: string
    requestType: string
  }) {
    return this.repos.aiRequest.findLatestByEntity(input)
  }

  async completeMatchCallback(aiRequestId: string, matchCount?: number): Promise<void> {
    await this.repos.aiRequest.completeMatchCallback(aiRequestId, matchCount)
  }

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
