import type { MilestoneStatus, ProjectStatus } from '@/types/enums'

export interface MilestoneInput {
  title: string
  description?: string
  amount: number
  dueDate?: string
}

export interface CreateProjectInput {
  freelancerId: string
  title: string
  description?: string
  clientName?: string
  budget?: number
  currency?: string
  opportunityId?: string
  shortlistId?: string
  status?: ProjectStatus
  milestones: MilestoneInput[]
}

export interface ProjectSummary {
  id: string
  title: string
  status: ProjectStatus
  clientName: string | null
  freelancerId: string
  freelancerName: string | null
  budget: number | null
  currency: string
  milestoneCount: number
  completedMilestones: number
  createdAt: string
}

export interface MilestoneRow {
  id: string
  title: string
  description: string | null
  amount: number
  dueDate: string | null
  status: MilestoneStatus
  sortOrder: number
  submissionNote: string | null
  submittedAt: string | null
  reviewNote: string | null
}

export const PROJECT_KANBAN_COLUMNS: Array<{
  status: ProjectStatus
  label: string
}> = [
  { status: 'draft', label: 'Draft' },
  { status: 'active', label: 'Active' },
  { status: 'in_review', label: 'In review' },
  { status: 'completed', label: 'Completed' },
  { status: 'archived', label: 'Archived' },
]

export const MANAGER_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['active', 'canceled'],
  active: ['in_review', 'completed', 'archived', 'canceled'],
  in_review: ['active', 'completed', 'archived'],
  completed: ['archived', 'active'],
  archived: ['active'],
  canceled: ['draft'],
}

export const FREELANCER_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: [],
  active: ['in_review'],
  in_review: [],
  completed: [],
  archived: [],
  canceled: [],
}
