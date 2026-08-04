/** WhatsApp Platform module types. */

export const WHATSAPP_PLATFORM_INTENTS = [
  'opportunity.interested',
  'opportunity.declined',
  'opportunity.create',
  'milestone.submit',
  'milestone.start',
  'milestone.approve',
  'milestone.revision',
  'project.status',
  'project.approve',
  'assignment.accept',
  'assignment.reject',
  'deliverable.submit',
  'approval.approve',
  'approval.reject',
  'workflow.trigger',
  'notification.send',
  'opt_out',
  'help',
  'agent.query',
  'unknown',
] as const

export type WhatsAppPlatformIntent = (typeof WHATSAPP_PLATFORM_INTENTS)[number]

export const WHATSAPP_EVENT_TYPES = {
  INBOUND: 'whatsapp.inbound',
  INTENT_HANDLED: 'whatsapp.intent_handled',
  AGENT_REQUESTED: 'whatsapp.agent_requested',
  OPT_OUT: 'whatsapp.opt_out',
  COMMAND_EXECUTED: 'whatsapp.command.executed',
  APPROVAL_RESOLVED: 'whatsapp.approval.resolved',
  MEMORY_RECORDED: 'whatsapp.memory.recorded',
  WORKFLOW_TRIGGERED: 'whatsapp.workflow.triggered',
  NOTIFICATION_SENT: 'whatsapp.notification.sent',
} as const

export interface WhatsAppAuditEntry {
  id: string
  tenantId: string
  actorId: string | null
  freelancerId: string | null
  action: string
  entityType: string
  entityId: string
  channel: string
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  metadata: Record<string, unknown>
  waMessageId: string | null
  createdAt: string
}

export interface WhatsAppMemoryEntry {
  id: string
  tenantId: string
  freelancerId: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  intent: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface WhatsAppApprovalGate {
  id: string
  tenantId: string
  approvalRequestId: string
  freelancerId: string | null
  phone: string | null
  status: 'pending' | 'resolved' | 'expired'
  createdAt: string
  resolvedAt: string | null
}

export interface WhatsAppConversationSummary {
  id: string
  tenantId: string
  freelancerId: string
  phone: string
  activeIntent: string | null
  activeEntityType: string | null
  activeEntityId: string | null
  memorySummary: string | null
  pendingApprovalId: string | null
  lastMessageAt: string
}

export interface WhatsAppObservabilitySummary {
  activeConversations: number
  messagesToday: number
  intentsHandledToday: number
  pendingApprovals: number
  auditEntriesToday: number
}

export interface WhatsAppCommandInput {
  intent: WhatsAppPlatformIntent
  freelancerId?: string
  entityType?: string
  entityId?: string
  payload?: Record<string, unknown>
  note?: string
}
