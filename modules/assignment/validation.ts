import { z } from 'zod'

const skillSchema = z.string().trim().min(1).max(50)

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['planned', 'confirmed', 'active', 'completed', 'canceled']).optional(),
  freelancer_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export const createAllocationSchema = z.object({
  freelancer_id: z.string().uuid(),
  project_id: z.string().uuid().optional().nullable(),
  opportunity_id: z.string().uuid().optional().nullable(),
  title: z.string().min(2).max(200),
  status: z.enum(['planned', 'confirmed', 'active']).optional(),
  allocation_pct: z.number().int().min(1).max(100).optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  notes: z.string().max(2000).optional().nullable(),
  skip_conflict_check: z.boolean().optional(),
})

export const updateAllocationSchema = createAllocationSchema.partial().extend({
  status: z.enum(['planned', 'confirmed', 'active', 'completed', 'canceled']).optional(),
})

export const createCapacitySchema = z.object({
  freelancer_id: z.string().uuid(),
  weekly_hours: z.number().positive().max(168).optional(),
  max_concurrent_assignments: z.number().int().min(1).max(20).optional(),
  effective_from: z.string().date().optional(),
  effective_to: z.string().date().optional().nullable(),
})

export const updateCapacitySchema = createCapacitySchema.partial().omit({ freelancer_id: true })

export const createScheduleSchema = z.object({
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  hours: z.number().nonnegative().optional(),
  notes: z.string().max(500).optional().nullable(),
})

export const updateScheduleSchema = createScheduleSchema.partial()

export const createRequirementSchema = z.object({
  required_skills: z.array(skillSchema).min(1),
  min_hours: z.number().nonnegative().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
})

export const updateRequirementSchema = createRequirementSchema.partial()

export const conflictCheckSchema = z.object({
  freelancer_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  allocation_pct: z.number().int().min(1).max(100).optional(),
  exclude_allocation_id: z.string().uuid().optional(),
})

export const suggestSchema = z.object({
  required_skills: z.array(skillSchema).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(50).optional(),
})

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  entity_type: z.string().optional(),
})
