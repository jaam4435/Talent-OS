export const AgentEvents = {
  SESSION_STARTED: 'agent.session_started',
  SESSION_COMPLETED: 'agent.session_completed',
} as const

export type AgentEventType = (typeof AgentEvents)[keyof typeof AgentEvents]
