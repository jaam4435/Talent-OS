/** Canonical projects domain event type strings. */
export const ProjectsEvents = {
  PROJECT_CREATED: 'project.created',
  PROJECT_ASSIGNED: 'project.assigned',
  MILESTONE_SUBMITTED: 'milestone.submitted',
  MILESTONE_APPROVED: 'milestone.approved',
  MILESTONE_REVISION_REQUESTED: 'milestone.revision_requested',
  MILESTONE_OVERDUE: 'milestone.overdue',
} as const

export type ProjectsEventType = (typeof ProjectsEvents)[keyof typeof ProjectsEvents]
