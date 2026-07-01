import { z } from 'zod'
import { DISCIPLINES } from '@/lib/utils/constants'

const skillSchema = z.string().trim().min(1).max(50)

export const freelancerProfileSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  discipline: z.enum(DISCIPLINES),
  skills: z.array(skillSchema).min(1, 'At least one skill is required'),
  tags: z.array(z.string().trim().min(1)).optional(),
  dayRate: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  bio: z.string().max(2000).optional(),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
  internalRating: z.number().min(1).max(5).optional(),
  internalNotes: z.string().max(5000).optional(),
})

export const freelancerSelfProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  skills: z.array(skillSchema).min(1, 'At least one skill is required'),
  tags: z.array(z.string().trim().min(1)).optional(),
  availability: z.enum(['available', 'busy', 'unavailable']),
})

export const portfolioItemSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().max(1000).optional(),
  projectUrl: z.string().url().optional().or(z.literal('')),
  imagePath: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export function parseSkillsInput(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .filter((skill, index, arr) => arr.indexOf(skill) === index)
}

export function formatSkillsForInput(skills: string[]): string {
  return skills.join(', ')
}
