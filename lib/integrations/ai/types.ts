export type AiProvider =
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'openrouter'
  | 'azure_openai'
  | 'mock'
export type AiRequestStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type AiRequestType =
  | 'talent_match'
  | 'brief_parse'
  | 'shortlist_summary'
  | 'digest'
  | 'project_summary'
  | 'status_assessment'
  | 'agent_reasoning'

export interface TalentMatchCandidate {
  id: string
  displayName: string
  discipline: string
  skills: string[]
  dayRate: number | null
  availability: string
  internalRating: number | null
  bio: string | null
  tags: string[]
}

export interface OpportunityMatchContext {
  id: string
  tenantId: string
  title: string
  description: string | null
  requiredSkills: string[]
  discipline: string | null
  budget: number | null
  currency: string
  clientName: string | null
}

export interface AiMatchScore {
  freelancerId: string
  score: number
  rationale: string
  skillOverlap: string[]
  rank?: number
}

export interface AiMatchResult {
  matches: AiMatchScore[]
  provider: AiProvider
  model: string
  inputTokens?: number
  outputTokens?: number
  estimatedCost?: number
  usedFallback: boolean
}

export interface AiRequestRecord {
  id: string
  tenantId: string
  correlationId: string | null
  provider: AiProvider
  model: string
  requestType: AiRequestType
  entityType: string | null
  entityId: string | null
  status: AiRequestStatus
  result: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

export interface TalentMatchScoreRow {
  id: string
  opportunityId: string
  freelancerId: string
  aiRequestId: string | null
  score: number
  rationale: string | null
  skillOverlap: string[]
  rank: number | null
  createdAt: string
  freelancer?: {
    id: string
    full_name: string
    discipline: string
    day_rate: number | null
    availability: string
    internal_rating: number | null
  }
}

export interface ParsedRequirements {
  skills: string[]
  deliverables: string[]
  suggestedMilestones: Array<{ title: string; description?: string }>
  budgetHint: number | null
  timelineHint: string | null
  risks: string[]
  summary: string
}

export interface BriefParseResult {
  requirements: ParsedRequirements
  provider: AiProvider
  model: string
  inputTokens?: number
  outputTokens?: number
  estimatedCost?: number
  usedFallback: boolean
}

export interface ProjectSummaryResult {
  summaryText: string
  highlights: string[]
  blockers: string[]
  nextActions: string[]
  provider: AiProvider
  model: string
  usedFallback: boolean
}

export interface StatusAssessmentResult {
  riskLevel: 'on_track' | 'at_risk' | 'blocked'
  suggestedStatus: string | null
  narrative: string
  reasons: string[]
  provider: AiProvider
  model: string
  usedFallback: boolean
}
