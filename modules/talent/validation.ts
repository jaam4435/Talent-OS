import { z } from 'zod'
import { DISCIPLINES } from '@/modules/core/utils/constants'

const skillSchema = z.string().trim().min(1).max(50)

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(120).optional(),
  discipline: z.string().optional(),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
  employment_type: z.enum(['freelance', 'contract', 'part_time', 'full_time']).optional(),
  timezone: z.string().max(64).optional(),
  min_completeness: z.coerce.number().int().min(0).max(100).optional(),
  skills: z.string().optional(),
  tags: z.string().optional(),
  sort: z.enum(['rating', 'name', 'rate_asc', 'rate_desc', 'active', 'completeness']).optional(),
})

export const advancedSearchSchema = listQuerySchema.extend({
  min_rate: z.coerce.number().nonnegative().optional(),
  max_rate: z.coerce.number().nonnegative().optional(),
  min_rating: z.coerce.number().min(1).max(5).optional(),
})

export const createTalentSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  discipline: z.enum(DISCIPLINES),
  skills: z.array(skillSchema).min(1),
  tags: z.array(z.string().trim().min(1)).optional(),
  day_rate: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  bio: z.string().max(2000).optional().nullable(),
  portfolio_url: z.string().url().optional().nullable().or(z.literal('')),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
  internal_rating: z.number().min(1).max(5).optional().nullable(),
  internal_notes: z.string().max(5000).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
  employment_type: z.enum(['freelance', 'contract', 'part_time', 'full_time']).optional(),
  languages: z
    .array(
      z.object({
        code: z.string().min(2).max(8),
        level: z.enum(['basic', 'conversational', 'fluent', 'native']).optional(),
      })
    )
    .optional(),
  ai_summary: z.string().max(5000).optional().nullable(),
})

export const updateTalentSchema = createTalentSchema.partial()

export const createExperienceSchema = z.object({
  company: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  description: z.string().max(5000).optional().nullable(),
  starts_on: z.string().date(),
  ends_on: z.string().date().optional().nullable(),
  skills: z.array(skillSchema).optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const updateExperienceSchema = createExperienceSchema.partial()

export const createDocumentSchema = z.object({
  doc_type: z.enum(['cv', 'certificate', 'reference', 'portfolio', 'other']).default('other'),
  file_name: z.string().min(1).max(255),
  file_path: z.string().min(1).max(500),
  mime_type: z.string().max(120).optional().nullable(),
  size_bytes: z.number().int().nonnegative().optional().nullable(),
})

export const createAvailabilitySlotSchema = z.object({
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  status: z.enum(['available', 'busy', 'unavailable', 'booked']).optional(),
  notes: z.string().max(500).optional().nullable(),
})

export const updateAvailabilitySlotSchema = createAvailabilitySlotSchema.partial()

export const availabilityCalendarQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
})

export const skillMatchSchema = z.object({
  skills: z.array(skillSchema).min(1),
  discipline: z.enum(DISCIPLINES).optional(),
  limit: z.number().int().min(1).max(50).optional(),
})

export const csvImportSchema = z.object({
  rows: z
    .array(
      z.object({
        full_name: z.string().min(1),
        email: z.string().email(),
        discipline: z.enum(DISCIPLINES),
        skills: z.array(skillSchema).min(1),
        phone: z.string().optional().nullable(),
        day_rate: z.number().nonnegative().optional().nullable(),
        availability: z.enum(['available', 'busy', 'unavailable']).optional(),
        timezone: z.string().optional().nullable(),
        employment_type: z.enum(['freelance', 'contract', 'part_time', 'full_time']).optional(),
      })
    )
    .min(1)
    .max(500),
  file_name: z.string().max(255).optional(),
})

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  entity_type: z.string().optional(),
})

export const marketplaceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().max(120).optional(),
  discipline: z.string().optional(),
  availability: z.enum(['available', 'busy', 'unavailable']).optional(),
})

export const marketplaceVisibilitySchema = z.object({
  visible: z.boolean(),
})
