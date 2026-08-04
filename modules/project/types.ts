import type { MilestoneStatus, ProjectStatus } from '@/modules/core/types/enums'
import { MANAGER_STATUS_TRANSITIONS, FREELANCER_STATUS_TRANSITIONS } from '@/lib/projects/types'

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ProjectHealthStatus = 'on_track' | 'at_risk' | 'blocked' | 'completed'
export type ProjectTaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked' | 'canceled'
export type ProjectDeliverableStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type ProjectAssetType = 'file' | 'link' | 'image' | 'document'
export type ProjectDependencyEntity = 'project' | 'milestone' | 'task' | 'deliverable'
export type ProjectTimelineEventType =
  | 'status_change'
  | 'milestone_completed'
  | 'task_completed'
  | 'deliverable_submitted'
  | 'comment'
  | 'deadline'
  | 'health_change'
  | 'dependency_added'

export type ProjectEntityType =
  | 'project'
  | 'milestone'
  | 'task'
  | 'deliverable'
  | 'asset'
  | 'comment'
  | 'dependency'
  | 'template'

export interface ProjectModuleSummary {
  id: string
  title: string
  status: ProjectStatus
  priority: ProjectPriority
  deadline: string | null
  clientName: string | null
  freelancerId: string
  companyId: string | null
  budget: number | null
  currency: string
  healthScore: number
  healthStatus: ProjectHealthStatus
  templateId: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectMilestone {
  id: string
  projectId: string
  title: string
  description: string | null
  amount: number
  dueDate: string | null
  status: MilestoneStatus
  priority: ProjectPriority
  sortOrder: number
  submittedAt: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectTask {
  id: string
  projectId: string
  milestoneId: string | null
  title: string
  description: string | null
  status: ProjectTaskStatus
  priority: ProjectPriority
  assigneeId: string | null
  dueDate: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ProjectDeliverable {
  id: string
  projectId: string
  milestoneId: string | null
  taskId: string | null
  title: string
  description: string | null
  status: ProjectDeliverableStatus
  filePath: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectAsset {
  id: string
  projectId: string
  assetType: ProjectAssetType
  name: string
  filePath: string | null
  url: string | null
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
  updatedAt: string
}

export interface ProjectComment {
  id: string
  projectId: string
  entityType: string
  entityId: string
  authorId: string | null
  body: string
  createdAt: string
  updatedAt: string
}

export interface ProjectDependency {
  id: string
  projectId: string
  predecessorType: ProjectDependencyEntity
  predecessorId: string
  successorType: ProjectDependencyEntity
  successorId: string
  notes: string | null
  createdAt: string
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string | null
  defaultMilestones: Array<Record<string, unknown>>
  defaultTasks: Array<Record<string, unknown>>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectHealth {
  healthScore: number
  healthStatus: ProjectHealthStatus
  overdueMilestones: number
  overdueTasks: number
  blockedTasks: number
  openDeliverables: number
}

export interface ProjectTimelineEvent {
  id: string
  projectId: string
  eventType: ProjectTimelineEventType
  title: string
  description: string | null
  actorId: string | null
  occurredAt: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface ProjectAuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  actorId: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface ProjectStatusTransition {
  from: ProjectStatus
  to: ProjectStatus
  allowed: boolean
  role: 'manager' | 'freelancer'
}

export const PROJECT_EVENT_TYPES = {
  CREATED: 'project.created',
  UPDATED: 'project.updated',
  STATUS_CHANGED: 'project.status_changed',
  DELETED: 'project.deleted',
  MILESTONE_UPDATED: 'project.milestone.updated',
  TASK_CREATED: 'project.task.created',
  TASK_COMPLETED: 'project.task.completed',
  DELIVERABLE_SUBMITTED: 'project.deliverable.submitted',
  COMMENT_ADDED: 'project.comment.added',
  DEPENDENCY_ADDED: 'project.dependency.added',
  HEALTH_UPDATED: 'project.health.updated',
  TEMPLATE_APPLIED: 'project.template.applied',
} as const

export const PROJECT_AI_ENTITIES = {
  project: { table: 'projects', contextField: 'ai_context' },
  milestone: { table: 'milestones', contextField: null },
  task: { table: 'project_tasks', contextField: null },
} as const

export { MANAGER_STATUS_TRANSITIONS, FREELANCER_STATUS_TRANSITIONS }
