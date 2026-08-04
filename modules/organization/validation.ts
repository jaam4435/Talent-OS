import { z } from 'zod'

const hexColor = z
  .string()
  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Invalid hex color')
  .optional()
  .nullable()

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM')
  .nullable()

export const businessHoursDaySchema = z.object({
  open: timeString,
  close: timeString,
  closed: z.boolean(),
})

export const businessHoursSchema = z.object({
  monday: businessHoursDaySchema,
  tuesday: businessHoursDaySchema,
  wednesday: businessHoursDaySchema,
  thursday: businessHoursDaySchema,
  friday: businessHoursDaySchema,
  saturday: businessHoursDaySchema,
  sunday: businessHoursDaySchema,
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  timezone: z.string().min(1).max(64).optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  subscription_reference: z.string().max(256).optional().nullable(),
})

export const updateBrandingSchema = z.object({
  logo_url: z.string().url().optional().nullable(),
  primary_color: hexColor,
  accent_color: hexColor,
})

export const updateBusinessHoursSchema = z.object({
  business_hours: businessHoursSchema,
})

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
    .optional(),
  description: z.string().max(500).optional().nullable(),
})

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
})

export const createTeamSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
    .optional(),
  description: z.string().max(500).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
})

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
})

export const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'talent_manager', 'freelancer', 'client']),
  company_id: z.string().uuid().optional(),
})

export const updateMemberSchema = z.object({
  role: z.enum(['admin', 'talent_manager', 'freelancer', 'client']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
})

export const teamMemberSchema = z.object({
  member_id: z.string().uuid(),
})

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(120).optional(),
  status: z.string().optional(),
  role: z.string().optional(),
})

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().max(64).optional(),
  entity_type: z.string().max(64).optional(),
})

export const DEFAULT_BUSINESS_HOURS = businessHoursSchema.parse({
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: null, close: null, closed: true },
  sunday: { open: null, close: null, closed: true },
})
