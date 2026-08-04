import { z } from 'zod'

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(120).optional(),
  status: z.enum(['draft', 'active', 'in_review', 'completed', 'archived', 'canceled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  health_status: z.enum(['on_track', 'at_risk', 'blocked', 'completed']).optional(),
  freelancer_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
})

export const createProjectSchema = z.object({
  freelancer_id: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional().nullable(),
  client_name: z.string().max(120).optional().nullable(),
  company_id: z.string().uuid().optional().nullable(),
  budget: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional(),
  opportunity_id: z.string().uuid().optional().nullable(),
  shortlist_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'active']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  deadline: z.string().date().optional().nullable(),
  template_id: z.string().uuid().optional().nullable(),
  requirements: z.record(z.unknown()).optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional().nullable(),
        amount: z.number().nonnegative(),
        due_date: z.string().date().optional().nullable(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      })
    )
    .min(1),
})

export const updateProjectSchema = createProjectSchema.partial().omit({ milestones: true, freelancer_id: true })

export const transitionStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'in_review', 'completed', 'archived', 'canceled']),
  role: z.enum(['manager', 'freelancer']).default('manager'),
})

export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  amount: z.number().nonnegative(),
  due_date: z.string().date().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const updateMilestoneSchema = createMilestoneSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'submitted', 'approved', 'revision', 'canceled']).optional(),
})

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  milestone_id: z.string().uuid().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'done', 'blocked', 'canceled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
})

export const updateTaskSchema = createTaskSchema.partial()

export const createDeliverableSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  milestone_id: z.string().uuid().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  file_path: z.string().max(500).optional().nullable(),
})

export const updateDeliverableSchema = createDeliverableSchema.partial()

export const createAssetSchema = z.object({
  asset_type: z.enum(['file', 'link', 'image', 'document']).default('file'),
  name: z.string().min(1).max(255),
  file_path: z.string().max(500).optional().nullable(),
  url: z.string().url().optional().nullable(),
  mime_type: z.string().max(120).optional().nullable(),
  size_bytes: z.number().int().nonnegative().optional().nullable(),
})

export const createCommentSchema = z.object({
  entity_type: z.string().min(2).max(40).default('project'),
  entity_id: z.string().uuid(),
  body: z.string().min(1).max(10000),
})

export const createDependencySchema = z.object({
  predecessor_type: z.enum(['project', 'milestone', 'task', 'deliverable']),
  predecessor_id: z.string().uuid(),
  successor_type: z.enum(['project', 'milestone', 'task', 'deliverable']),
  successor_id: z.string().uuid(),
  notes: z.string().max(500).optional().nullable(),
})

export const createTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  default_milestones: z.array(z.record(z.unknown())).optional(),
  default_tasks: z.array(z.record(z.unknown())).optional(),
  is_active: z.boolean().optional(),
})

export const updateTemplateSchema = createTemplateSchema.partial()

export const applyTemplateSchema = z.object({
  freelancer_id: z.string().uuid(),
  title: z.string().min(2).max(200).optional(),
  company_id: z.string().uuid().optional().nullable(),
  deadline: z.string().date().optional().nullable(),
})

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().optional(),
  entity_type: z.string().optional(),
})
