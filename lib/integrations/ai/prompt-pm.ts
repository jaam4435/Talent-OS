import { hashPayload } from '@/lib/integrations/encryption'

const BRIEF_PARSE_SYSTEM = `You are an AI project manager for creative agencies.
Extract structured requirements from client briefs.
Return only valid JSON matching the schema.
Infer practical deliverables and milestone suggestions when not explicitly stated.`

const PROJECT_SUMMARY_SYSTEM = `You are an AI project manager summarizing project health for agency staff.
Be concise, actionable, and factual based only on provided data.
Highlight blockers and recommended next steps.`

const STATUS_ASSESSMENT_SYSTEM = `You are an AI project manager assessing delivery risk.
Classify project health as on_track, at_risk, or blocked.
Suggest a project status only when clearly warranted; otherwise return null for suggested_status.
Never invent facts not present in the input.`

export function buildBriefParsePrompt(input: {
  title: string
  description: string | null
  budget?: number | null
  currency?: string
}) {
  const userPrompt = {
    title: input.title,
    description: input.description,
    budget: input.budget,
    currency: input.currency,
    instructions:
      'Extract skills, deliverables, risks, budget/timeline hints, and 2-4 suggested milestones.',
  }

  return {
    system: BRIEF_PARSE_SYSTEM,
    user: JSON.stringify(userPrompt, null, 2),
    promptHash: hashPayload({ system: BRIEF_PARSE_SYSTEM, user: userPrompt }),
  }
}

export const BRIEF_PARSE_SCHEMA = {
  name: 'brief_parse_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      skills: { type: 'array', items: { type: 'string' } },
      deliverables: { type: 'array', items: { type: 'string' } },
      suggested_milestones: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['title', 'description'],
        },
      },
      budget_hint: { type: ['number', 'null'] },
      timeline_hint: { type: ['string', 'null'] },
      risks: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
    },
    required: [
      'skills',
      'deliverables',
      'suggested_milestones',
      'budget_hint',
      'timeline_hint',
      'risks',
      'summary',
    ],
  },
} as const

export function buildProjectSummaryPrompt(input: Record<string, unknown>) {
  return {
    system: PROJECT_SUMMARY_SYSTEM,
    user: JSON.stringify(input, null, 2),
    promptHash: hashPayload({ system: PROJECT_SUMMARY_SYSTEM, user: input }),
  }
}

export const PROJECT_SUMMARY_SCHEMA = {
  name: 'project_summary_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary_text: { type: 'string' },
      highlights: { type: 'array', items: { type: 'string' } },
      blockers: { type: 'array', items: { type: 'string' } },
      next_actions: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary_text', 'highlights', 'blockers', 'next_actions'],
  },
} as const

export function buildStatusAssessmentPrompt(input: Record<string, unknown>) {
  return {
    system: STATUS_ASSESSMENT_SYSTEM,
    user: JSON.stringify(input, null, 2),
    promptHash: hashPayload({ system: STATUS_ASSESSMENT_SYSTEM, user: input }),
  }
}

export const STATUS_ASSESSMENT_SCHEMA = {
  name: 'status_assessment_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      risk_level: { type: 'string', enum: ['on_track', 'at_risk', 'blocked'] },
      suggested_status: { type: ['string', 'null'] },
      narrative: { type: 'string' },
      reasons: { type: 'array', items: { type: 'string' } },
    },
    required: ['risk_level', 'suggested_status', 'narrative', 'reasons'],
  },
} as const

export const SHORTLIST_SUMMARY_SCHEMA = {
  name: 'shortlist_summary_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary_text: { type: 'string' },
      recommended_freelancer_id: { type: ['string', 'null'] },
      comparison_points: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary_text', 'recommended_freelancer_id', 'comparison_points'],
  },
} as const
