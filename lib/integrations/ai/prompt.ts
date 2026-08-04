import { hashPayload } from '@/lib/integrations/encryption'
import type { OpportunityMatchContext, TalentMatchCandidate } from '@/lib/integrations/ai/types'

const SYSTEM_PROMPT = `You are a talent matching engine for creative agencies.
Rank freelancers against an opportunity based on skill fit, discipline alignment, availability, internal rating, and budget fit.
Return only valid JSON matching the schema. Scores must be 0-100.
Prefer candidates with overlapping required skills and matching discipline.
Penalize unavailable or busy freelancers.`

export function buildTalentMatchPrompt(
  opportunity: OpportunityMatchContext,
  candidates: TalentMatchCandidate[]
) {
  const userPrompt = {
    opportunity: {
      title: opportunity.title,
      description: opportunity.description,
      required_skills: opportunity.requiredSkills,
      discipline: opportunity.discipline,
      budget: opportunity.budget,
      currency: opportunity.currency,
      client_name: opportunity.clientName,
    },
    candidates: candidates.map((c) => ({
      freelancer_id: c.id,
      display_name: c.displayName,
      discipline: c.discipline,
      skills: c.skills,
      day_rate: c.dayRate,
      availability: c.availability,
      internal_rating: c.internalRating,
      bio_excerpt: c.bio ? c.bio.slice(0, 280) : null,
      tags: c.tags,
    })),
    instructions:
      'Return top matches sorted by score descending. Include skill_overlap as lowercase skill names.',
  }

  return {
    system: SYSTEM_PROMPT,
    user: JSON.stringify(userPrompt, null, 2),
    promptHash: hashPayload({ system: SYSTEM_PROMPT, user: userPrompt }),
  }
}

export const TALENT_MATCH_RESPONSE_SCHEMA = {
  name: 'talent_match_result',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      matches: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            freelancer_id: { type: 'string' },
            score: { type: 'number' },
            rationale: { type: 'string' },
            skill_overlap: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['freelancer_id', 'score', 'rationale', 'skill_overlap'],
        },
      },
    },
    required: ['matches'],
  },
} as const
