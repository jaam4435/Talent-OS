/** Canonical projects domain event type strings. */
export const ProjectsEvents = {
  PROJECT_CREATED: 'project.created',
  MILESTONE_SUBMITTED: 'milestone.submitted',
} as const

export type ProjectsEventType = (typeof ProjectsEvents)[keyof typeof ProjectsEvents]
