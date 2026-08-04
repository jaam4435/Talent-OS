import { z } from 'zod'
import { WHATSAPP_PLATFORM_INTENTS } from './types'

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const auditQuerySchema = listQuerySchema.extend({
  action: z.string().optional(),
  entity_type: z.string().optional(),
  freelancer_id: z.string().uuid().optional(),
})

export const memoryQuerySchema = listQuerySchema.extend({
  freelancer_id: z.string().uuid(),
})

export const commandSchema = z.object({
  intent: z.enum(WHATSAPP_PLATFORM_INTENTS as unknown as [string, ...string[]]),
  freelancer_id: z.string().uuid().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  note: z.string().optional(),
})

export const createOpportunityCommandSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  budget: z.number().positive().optional(),
  required_skills: z.array(z.string()).default([]),
  company_id: z.string().uuid().optional(),
})

export const resolveApprovalSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().optional(),
})

export const triggerWorkflowSchema = z.object({
  workflow_id: z.string().min(1),
  aggregate_type: z.string().min(1),
  aggregate_id: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
})

export const sendNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.unknown()).optional(),
})
