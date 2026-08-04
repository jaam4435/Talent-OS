export type AssignmentStatus = 'planned' | 'confirmed' | 'active' | 'completed' | 'canceled'
export type AssignmentConflictType = 'double_booking' | 'over_allocation' | 'availability_gap'
export type AssignmentConflictSeverity = 'warning' | 'error'

export type AssignmentEntityType =
  | 'allocation'
  | 'capacity'
  | 'schedule'
  | 'requirement'
  | 'conflict'

export interface AssignmentAllocation {
  id: string
  freelancerId: string
  projectId: string | null
  opportunityId: string | null
  title: string
  status: AssignmentStatus
  allocationPct: number
  startsAt: string
  endsAt: string
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface AssignmentCapacity {
  id: string
  freelancerId: string
  weeklyHours: number
  maxConcurrentAssignments: number
  effectiveFrom: string
  effectiveTo: string | null
  createdAt: string
  updatedAt: string
}

export interface AssignmentSchedule {
  id: string
  allocationId: string
  startsAt: string
  endsAt: string
  hours: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface AssignmentRequirement {
  id: string
  allocationId: string
  requiredSkills: string[]
  minHours: number | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface AssignmentConflict {
  id: string
  freelancerId: string
  conflictType: AssignmentConflictType
  severity: AssignmentConflictSeverity
  allocationIdA: string
  allocationIdB: string | null
  details: Record<string, unknown>
  resolvedAt: string | null
  createdAt: string
}

export interface AssignmentConflictCheck {
  conflictType: AssignmentConflictType
  severity: AssignmentConflictSeverity
  conflictingAllocationId: string | null
  overlappingPct: number | null
  message: string
}

export interface AssignmentSuggestion {
  freelancerId: string
  fullName: string
  discipline: string
  dayRate: number | null
  internalRating: number | null
  skillMatchCount: number
  currentAllocationPct: number
  availability: string
}

export interface AssignmentHistoryEntry {
  id: string
  allocationId: string
  action: string
  actorId: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  createdAt: string
}

export interface AssignmentAuditEntry {
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

export const ASSIGNMENT_EVENT_TYPES = {
  CREATED: 'assignment.created',
  UPDATED: 'assignment.updated',
  STATUS_CHANGED: 'assignment.status_changed',
  CANCELED: 'assignment.canceled',
  CONFLICT_DETECTED: 'assignment.conflict.detected',
  CONFLICT_RESOLVED: 'assignment.conflict.resolved',
  CAPACITY_UPDATED: 'assignment.capacity.updated',
  SCHEDULE_ADDED: 'assignment.schedule.added',
  SUGGESTION_GENERATED: 'assignment.suggestion.generated',
} as const

export const ASSIGNMENT_AI_ENTITIES = {
  allocation: { table: 'assignment_allocations', contextField: null },
  capacity: { table: 'assignment_capacity', contextField: null },
} as const
