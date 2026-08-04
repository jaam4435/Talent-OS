import { z } from 'zod'

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  workflow_id: z.string().optional(),
  trigger_event_type: z.string().optional(),
})

export const runQuerySchema = listQuerySchema.extend({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export const jobQuerySchema = listQuerySchema.extend({
  run_id: z.string().uuid().optional(),
  queue_name: z.string().optional(),
})

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  run_id: z.string().uuid().optional(),
  status: z.enum(['started', 'completed', 'failed', 'skipped', 'compensated']).optional(),
})

export const compensationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  run_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'skipped']).optional(),
})

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  entity_type: z.string().optional(),
})

export const retryJobsSchema = z.object({
  job_ids: z.array(z.string().uuid()).min(1).max(100),
})

export const retryCompensationsSchema = z.object({
  compensation_ids: z.array(z.string().uuid()).min(1).max(100),
})

export const retryEventsSchema = z.object({
  event_ids: z.array(z.string().uuid()).min(1).max(100),
})

export const triggerWorkflowSchema = z.object({
  workflow_id: z.string().min(1),
  aggregate_type: z.string().min(1),
  aggregate_id: z.string().uuid(),
  payload: z.record(z.unknown()).optional(),
  idempotency_key: z.string().optional(),
})

export const createDefinitionSchema = z.object({
  id: z.string().regex(/^wf-[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  trigger_event_type: z.string().min(1),
  conditions: z.array(z.record(z.unknown())).optional(),
  steps: z.array(z.record(z.unknown())).min(1),
  compensation: z.array(z.record(z.unknown())).optional(),
  queue_name: z.enum(['default', 'integrations', 'ai', 'notifications', 'approvals']).optional(),
})

export const updateDefinitionSchema = createDefinitionSchema.partial().omit({ id: true })

export const resolveApprovalSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().max(1000).optional().nullable(),
})
