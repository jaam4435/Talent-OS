import { z } from 'zod'
import { DISCIPLINES } from '@/lib/utils/constants'

const skillSchema = z.string().trim().min(1).max(50)

export const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  budget: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  requiredSkills: z.array(skillSchema).min(1, 'At least one skill is required'),
  discipline: z.enum(DISCIPLINES).optional(),
  clientName: z.string().max(200).optional(),
  deadline: z.string().optional(),
  responseDeadline: z.string().optional(),
  status: z.enum(['draft', 'open']).optional(),
})

export const broadcastOpportunitySchema = z.object({
  opportunityId: z.string().uuid(),
  freelancerIds: z.array(z.string().uuid()).min(1, 'Select at least one freelancer'),
})

export const opportunityResponseSchema = z.object({
  opportunityId: z.string().uuid(),
  response: z.enum(['interested', 'declined']),
  note: z.string().max(1000).optional(),
})

export function parseSkillsInput(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function formatSkillsForInput(skills: string[]): string {
  return skills.join(', ')
}
