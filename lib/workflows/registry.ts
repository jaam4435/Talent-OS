import type { WorkflowDefinition } from '@/lib/workflows/types'

/**
 * Built-in workflow definitions keyed to existing domain_events.
 * Every major business process is modeled as trigger → conditions → steps.
 */
export const WORKFLOW_REGISTRY: WorkflowDefinition[] = [
  {
    id: 'wf-opportunity-broadcast',
    name: 'Opportunity Broadcast',
    description: 'Dispatch broadcast to n8n for WhatsApp/email outreach',
    trigger: { type: 'domain_event', eventType: 'opportunity.broadcast' },
    queue: 'integrations',
    steps: [{ id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n' }],
  },
  {
    id: 'wf-opportunity-opened',
    name: 'Opportunity Opened',
    description: 'Notify when opportunity status becomes open',
    trigger: { type: 'domain_event', eventType: 'opportunity.opened' },
    queue: 'integrations',
    steps: [{ id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n' }],
  },
  {
    id: 'wf-opportunity-response',
    name: 'Opportunity Response',
    description: 'Process freelancer response to broadcast',
    trigger: { type: 'domain_event', eventType: 'opportunity.response' },
    queue: 'notifications',
    steps: [
      { id: 'notify-creator', type: 'action', action: 'notify', config: { type: 'opportunity_response' } },
      { id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n', queue: 'integrations' },
    ],
  },
  {
    id: 'wf-project-assigned',
    name: 'Project Assigned',
    description: 'Onboard freelancer when project is created',
    trigger: { type: 'domain_event', eventType: 'project.assigned' },
    queue: 'integrations',
    steps: [
      { id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n' },
      { id: 'log-activity', type: 'action', action: 'log_activity', config: { action: 'workflow_project_assigned' } },
    ],
  },
  {
    id: 'wf-milestone-submitted',
    name: 'Milestone Submitted',
    description: 'Manager review gate after milestone submission',
    trigger: { type: 'domain_event', eventType: 'milestone.submitted' },
    queue: 'approvals',
    steps: [
      {
        id: 'manager-review',
        type: 'approval',
        config: {
          approverRole: 'project_manager',
          title: 'Review milestone submission',
          body: 'A freelancer submitted a milestone for your review.',
          expiresInHours: 72,
          onApproved: [
            { id: 'dispatch-n8n-approved', type: 'action', action: 'dispatch_n8n' },
          ],
          onRejected: [
            { id: 'dispatch-n8n-revision', type: 'action', action: 'dispatch_n8n' },
          ],
        },
      },
    ],
  },
  {
    id: 'wf-milestone-approved',
    name: 'Milestone Approved',
    description: 'Payment and completion flow after approval',
    trigger: { type: 'domain_event', eventType: 'milestone.approved' },
    queue: 'integrations',
    steps: [
      { id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n' },
      { id: 'notify-freelancer', type: 'action', action: 'notify', config: { type: 'milestone_approved' } },
    ],
  },
  {
    id: 'wf-milestone-revision',
    name: 'Milestone Revision Requested',
    trigger: { type: 'domain_event', eventType: 'milestone.revision_requested' },
    queue: 'notifications',
    steps: [
      { id: 'notify-freelancer', type: 'action', action: 'notify', config: { type: 'milestone_revision' } },
    ],
  },
  {
    id: 'wf-milestone-overdue',
    name: 'Milestone Overdue',
    trigger: { type: 'domain_event', eventType: 'milestone.overdue' },
    queue: 'notifications',
    steps: [
      { id: 'notify-manager', type: 'action', action: 'notify', config: { type: 'milestone_overdue' } },
      { id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n', queue: 'integrations' },
    ],
  },
  {
    id: 'wf-ai-match',
    name: 'AI Talent Match',
    trigger: { type: 'domain_event', eventType: 'ai.match_requested' },
    queue: 'ai',
    steps: [{ id: 'execute-ai', type: 'action', action: 'execute_ai', maxRetries: 3 }],
  },
  {
    id: 'wf-ai-brief-parse',
    name: 'AI Brief Parse',
    trigger: { type: 'domain_event', eventType: 'ai.brief_parse_requested' },
    queue: 'ai',
    steps: [{ id: 'execute-ai', type: 'action', action: 'execute_ai', maxRetries: 3 }],
  },
  {
    id: 'wf-ai-summary',
    name: 'AI Project Summary',
    trigger: { type: 'domain_event', eventType: 'ai.summary_requested' },
    queue: 'ai',
    steps: [{ id: 'execute-ai', type: 'action', action: 'execute_ai', maxRetries: 3 }],
  },
  {
    id: 'wf-ai-status',
    name: 'AI Status Assessment',
    trigger: { type: 'domain_event', eventType: 'ai.status_assessment_requested' },
    queue: 'ai',
    steps: [{ id: 'execute-ai', type: 'action', action: 'execute_ai', maxRetries: 3 }],
  },
  {
    id: 'wf-payment-approved',
    name: 'Payment Approved',
    trigger: { type: 'domain_event', eventType: 'payment.approved' },
    queue: 'integrations',
    steps: [{ id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n' }],
  },
  {
    id: 'wf-payment-paid',
    name: 'Payment Paid',
    trigger: { type: 'domain_event', eventType: 'payment.paid' },
    queue: 'integrations',
    steps: [
      { id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n' },
      { id: 'notify-freelancer', type: 'action', action: 'notify', config: { type: 'payment_paid' } },
    ],
  },
  {
    id: 'wf-whatsapp-inbound',
    name: 'WhatsApp Inbound Message',
    trigger: { type: 'domain_event', eventType: 'whatsapp.inbound' },
    queue: 'integrations',
    steps: [{ id: 'log-activity', type: 'action', action: 'log_activity', config: { action: 'whatsapp_inbound' } }],
  },
  {
    id: 'wf-whatsapp-agent',
    name: 'WhatsApp Agent Query',
    trigger: { type: 'domain_event', eventType: 'whatsapp.agent_requested' },
    queue: 'ai',
    steps: [{ id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n' }],
  },
  {
    id: 'wf-whatsapp-opt-out',
    name: 'WhatsApp Opt Out',
    trigger: { type: 'domain_event', eventType: 'whatsapp.opt_out' },
    queue: 'notifications',
    steps: [{ id: 'log-activity', type: 'action', action: 'log_activity', config: { action: 'whatsapp_opt_out' } }],
  },
  {
    id: 'wf-whatsapp-send',
    name: 'WhatsApp Outbound Send',
    description: 'Dispatch outbound WhatsApp message via n8n',
    trigger: { type: 'domain_event', eventType: 'whatsapp.send_requested' },
    queue: 'integrations',
    steps: [{ id: 'dispatch-n8n', type: 'action', action: 'dispatch_n8n' }],
  },
]

export function findWorkflowsForEvent(eventType: string): WorkflowDefinition[] {
  return WORKFLOW_REGISTRY.filter((w) => w.trigger.eventType === eventType)
}

export function findWorkflowById(workflowId: string): WorkflowDefinition | undefined {
  return WORKFLOW_REGISTRY.find((w) => w.id === workflowId)
}
