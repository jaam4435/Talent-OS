import { createAdminServices } from '@/lib/services/factory'
import type { AiMatchResult, OpportunityMatchContext } from '@/lib/integrations/ai/types'

interface RuleBasedRow {
  freelancer_id: string
  full_name: string
  discipline: string
  day_rate: number | null
  internal_rating: number | null
  skill_match_count: number
}

export async function runRuleBasedMatching(
  opportunity: OpportunityMatchContext
): Promise<AiMatchResult> {
  const services = await createAdminServices()
  const rows = (await services.talent.suggestForOpportunity(opportunity.id)) as RuleBasedRow[]
  const requiredSkills = opportunity.requiredSkills.map((s) => s.toLowerCase())
  const requiredCount = Math.max(requiredSkills.length, 1)

  const skillRows = await services.talent.findSkillsByIds(rows.map((r) => r.freelancer_id))
  const skillMap = new Map(
    skillRows.map((f) => [f.id, (f.skills ?? []).map((s: string) => s.toLowerCase())])
  )

  const matches = rows.map((row, index) => {
    const freelancerSkills = skillMap.get(row.freelancer_id) ?? []
    const skillOverlap = requiredSkills.filter((s) => freelancerSkills.includes(s))
    const skillRatio = row.skill_match_count / requiredCount
    const ratingBoost = row.internal_rating ? (row.internal_rating - 3) * 5 : 0
    const score = Math.min(100, Math.max(0, skillRatio * 70 + 20 + ratingBoost))

    return {
      freelancerId: row.freelancer_id,
      score: Math.round(score * 100) / 100,
      rationale: `Rule-based match: ${row.skill_match_count} overlapping skill(s), ${row.discipline} discipline.`,
      skillOverlap,
      rank: index + 1,
    }
  })

  return {
    matches,
    provider: 'openai',
    model: 'rule-based-fallback',
    usedFallback: true,
  }
}
