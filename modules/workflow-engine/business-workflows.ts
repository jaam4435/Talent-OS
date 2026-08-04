import type { WorkflowDefinition } from '@/lib/workflows/types'
import { CRM_EVENT_TYPES } from '@/modules/crm/types'
import { PROJECT_EVENT_TYPES } from '@/modules/project/types'
import { ASSIGNMENT_EVENT_TYPES } from '@/modules/assignment/types'
import { BUSINESS_WORKFLOW_IDS, type BusinessWorkflowMeta } from '@/modules/workflow-engine/types'

const notifyStep = (id: string, type: string, title: string) =>
  ({ id, type: 'action' as const, action: 'notify' as const, config: { type, title } })

const logStep = (id: string, action: string) =>
  ({ id, type: 'action' as const, action: 'log_activity' as const, config: { action } })

const n8nStep = (id: string, queue: 'integrations' | 'notifications' | 'approvals' = 'integrations') =>
  ({ id, type: 'action' as const, action: 'dispatch_n8n' as const, queue })

const emitStep = (id: string, eventType: string) =>
  ({ id, type: 'action' as const, action: 'emit_event' as const, config: { eventType } })

/** Ten reusable business workflows mapped to domain events. */
export const BUSINESS_WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    id: BUSINESS_WORKFLOW_IDS.LEAD_QUALIFICATION,
    name: 'Lead Qualification',
    description: 'Score and route qualified CRM leads to sales pipeline',
    trigger: { type: 'domain_event', eventType: CRM_EVENT_TYPES.LEAD_STATUS_CHANGED },
    conditions: [{ field: 'payload.status', operator: 'eq', value: 'qualified' }],
    queue: 'notifications',
    steps: [
      logStep('log-qualified', 'lead_qualified'),
      notifyStep('notify-owner', 'lead_qualified', 'Lead qualified'),
      n8nStep('dispatch-qualification'),
    ],
    compensation: [logStep('compensate-qualification', 'lead_qualification_rollback')],
  },
  {
    id: BUSINESS_WORKFLOW_IDS.CLIENT_ONBOARDING,
    name: 'Client Onboarding',
    description: 'Welcome client, create company profile, and kick off onboarding checklist',
    trigger: { type: 'domain_event', eventType: CRM_EVENT_TYPES.LEAD_CONVERTED },
    queue: 'integrations',
    steps: [
      logStep('log-onboarding', 'client_onboarding_started'),
      notifyStep('notify-client', 'client_onboarding', 'Welcome to Talent OS'),
      n8nStep('dispatch-onboarding'),
      emitStep('emit-company-ready', CRM_EVENT_TYPES.COMPANY_CREATED),
    ],
    compensation: [
      logStep('compensate-onboarding', 'client_onboarding_rollback'),
      notifyStep('notify-rollback', 'client_onboarding_failed', 'Onboarding requires attention'),
    ],
  },
  {
    id: BUSINESS_WORKFLOW_IDS.PROJECT_CREATION,
    name: 'Project Creation',
    description: 'Initialize project workspace, notify stakeholders, trigger matching',
    trigger: { type: 'domain_event', eventType: PROJECT_EVENT_TYPES.CREATED },
    queue: 'integrations',
    steps: [
      logStep('log-project-created', 'project_creation'),
      notifyStep('notify-pm', 'project_created', 'New project created'),
      n8nStep('dispatch-project-setup'),
      emitStep('request-matching', 'ai.match_requested'),
    ],
    compensation: [logStep('compensate-project', 'project_creation_rollback')],
  },
  {
    id: BUSINESS_WORKFLOW_IDS.TALENT_MATCHING,
    name: 'Talent Matching',
    description: 'Run AI talent matching and notify managers of results',
    trigger: { type: 'domain_event', eventType: 'ai.match_requested' },
    queue: 'ai',
    steps: [
      { id: 'execute-match', type: 'action', action: 'execute_ai', maxRetries: 3 },
      notifyStep('notify-match-results', 'talent_match_complete', 'Talent match results ready'),
      logStep('log-match', 'talent_matching_complete'),
    ],
    compensation: [logStep('compensate-match', 'talent_matching_rollback')],
  },
  {
    id: BUSINESS_WORKFLOW_IDS.ASSIGNMENT,
    name: 'Assignment',
    description: 'Confirm talent assignment, notify freelancer, sync integrations',
    trigger: { type: 'domain_event', eventType: ASSIGNMENT_EVENT_TYPES.CREATED },
    queue: 'notifications',
    steps: [
      logStep('log-assignment', 'assignment_created'),
      notifyStep('notify-talent', 'assignment_created', 'New assignment'),
      n8nStep('dispatch-assignment'),
    ],
    compensation: [
      logStep('compensate-assignment', 'assignment_rollback'),
      notifyStep('notify-assignment-failed', 'assignment_failed', 'Assignment workflow failed'),
    ],
  },
  {
    id: BUSINESS_WORKFLOW_IDS.QA,
    name: 'QA',
    description: 'Quality assurance review gate for deliverables and milestones',
    trigger: { type: 'domain_event', eventType: PROJECT_EVENT_TYPES.DELIVERABLE_SUBMITTED },
    queue: 'approvals',
    steps: [
      {
        id: 'qa-review',
        type: 'approval',
        config: {
          approverRole: 'project_manager',
          title: 'QA review required',
          body: 'A deliverable was submitted and requires quality review.',
          expiresInHours: 48,
          onApproved: [
            logStep('log-qa-passed', 'qa_passed'),
            n8nStep('dispatch-qa-approved'),
          ],
          onRejected: [
            logStep('log-qa-failed', 'qa_failed'),
            notifyStep('notify-revision', 'qa_revision', 'QA revision requested'),
          ],
        },
      },
    ],
    compensation: [logStep('compensate-qa', 'qa_rollback')],
  },
  {
    id: BUSINESS_WORKFLOW_IDS.DELIVERY,
    name: 'Delivery',
    description: 'Finalize delivery after milestone approval',
    trigger: { type: 'domain_event', eventType: 'milestone.approved' },
    queue: 'integrations',
    steps: [
      logStep('log-delivery', 'delivery_started'),
      n8nStep('dispatch-delivery'),
      notifyStep('notify-delivery', 'delivery_complete', 'Delivery confirmed'),
    ],
    compensation: [logStep('compensate-delivery', 'delivery_rollback')],
  },
  {
    id: BUSINESS_WORKFLOW_IDS.INVOICE,
    name: 'Invoice',
    description: 'Generate invoice and payment notification after approval',
    trigger: { type: 'domain_event', eventType: 'payment.approved' },
    queue: 'integrations',
    steps: [
      logStep('log-invoice', 'invoice_generated'),
      n8nStep('dispatch-invoice'),
      notifyStep('notify-invoice', 'invoice_ready', 'Invoice ready for payment'),
    ],
    compensation: [logStep('compensate-invoice', 'invoice_rollback')],
  },
  {
    id: BUSINESS_WORKFLOW_IDS.PROJECT_CLOSURE,
    name: 'Project Closure',
    description: 'Close project, archive assets, notify stakeholders',
    trigger: { type: 'domain_event', eventType: PROJECT_EVENT_TYPES.STATUS_CHANGED },
    conditions: [{ field: 'payload.status', operator: 'eq', value: 'completed' }],
    queue: 'integrations',
    steps: [
      logStep('log-closure', 'project_closure'),
      n8nStep('dispatch-closure'),
      notifyStep('notify-closure', 'project_closed', 'Project closed'),
      emitStep('emit-closure', 'project.closed'),
    ],
    compensation: [logStep('compensate-closure', 'project_closure_rollback')],
  },
]

export const BUSINESS_WORKFLOW_CATALOG: BusinessWorkflowMeta[] = BUSINESS_WORKFLOW_DEFINITIONS.map((d) => ({
  id: d.id as BusinessWorkflowMeta['id'],
  name: d.name,
  description: d.description ?? '',
  definition: d,
}))

export function getBusinessWorkflowById(id: string): WorkflowDefinition | undefined {
  return BUSINESS_WORKFLOW_DEFINITIONS.find((w) => w.id === id)
}
