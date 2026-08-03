import { z } from 'zod'

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(120).optional(),
  status: z.string().optional(),
  stage_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
})

export const createLeadSchema = z.object({
  title: z.string().min(2).max(200),
  source: z.string().max(120).optional().nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified']).optional(),
  company_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  value_estimate: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  description: z.string().max(5000).optional().nullable(),
})

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted']).optional(),
})

export const convertLeadSchema = z.object({
  create_company: z.boolean().default(true),
  company_name: z.string().min(2).max(120).optional(),
  create_deal: z.boolean().default(true),
  deal_title: z.string().min(2).max(200).optional(),
  deal_value: z.number().nonnegative().optional().nullable(),
  mark_client: z.boolean().default(false),
})

export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  contact_email: z.string().email().optional().nullable(),
  contact_name: z.string().max(120).optional().nullable(),
  website: z.string().url().optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  status: z.enum(['prospect', 'active', 'client', 'inactive']).optional(),
  notes: z.string().max(5000).optional().nullable(),
})

export const updateCompanySchema = createCompanySchema.partial()

export const createContactSchema = z.object({
  company_id: z.string().uuid().optional().nullable(),
  first_name: z.string().min(1).max(80),
  last_name: z.string().max(80).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  job_title: z.string().max(120).optional().nullable(),
  is_primary: z.boolean().optional(),
})

export const updateContactSchema = createContactSchema.partial()

export const createDealSchema = z.object({
  title: z.string().min(2).max(200),
  value: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  stage_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional().nullable(),
  lead_id: z.string().uuid().optional().nullable(),
  opportunity_id: z.string().uuid().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  expected_close_date: z.string().date().optional().nullable(),
  probability: z.number().int().min(0).max(100).optional().nullable(),
})

export const updateDealSchema = createDealSchema.partial()

export const moveDealStageSchema = z.object({
  stage_id: z.string().uuid(),
})

const contractFieldsSchema = z.object({
  title: z.string().min(2).max(200),
  deal_id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  value: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  status: z.enum(['draft', 'sent', 'signed', 'expired', 'canceled']).optional(),
  starts_on: z.string().date().optional().nullable(),
  ends_on: z.string().date().optional().nullable(),
  signed_at: z.string().datetime().optional().nullable(),
})

const signedAtRequired = (data: { status?: string; signed_at?: string | null }) =>
  data.status !== 'signed' || data.signed_at != null

export const createContractSchema = contractFieldsSchema.refine(signedAtRequired, {
  message: 'signed_at is required when status is signed',
  path: ['signed_at'],
})

export const updateContractSchema = contractFieldsSchema.partial().refine(signedAtRequired, {
  message: 'signed_at is required when status is signed',
  path: ['signed_at'],
})

export const createNoteSchema = z.object({
  entity_type: z.string().min(2).max(40),
  entity_id: z.string().uuid(),
  body: z.string().min(1).max(10000),
})

export const createAttachmentSchema = z.object({
  entity_type: z.string().min(2).max(40),
  entity_id: z.string().uuid(),
  file_name: z.string().min(1).max(255),
  file_path: z.string().min(1).max(1024),
  mime_type: z.string().max(120).optional().nullable(),
  size_bytes: z.number().int().nonnegative().optional().nullable(),
})

export const createActivitySchema = z.object({
  entity_type: z.string().min(2).max(40),
  entity_id: z.string().uuid(),
  activity_type: z.enum(['call', 'email', 'meeting', 'note', 'task', 'other']).optional(),
  subject: z.string().min(2).max(200),
  description: z.string().max(5000).optional().nullable(),
  occurred_at: z.string().datetime().optional(),
})

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().max(64).optional(),
  entity_type: z.string().max(64).optional(),
})
