import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { idOutputSchema, objectSchema, paginationProperties } from '@/lib/mcp/schemas/common'

export const WORKFLOW_TOOLS = [
  {
    name: 'workflow_emit_event',
    title: 'Emit Domain Event',
    description: 'Enqueue a domain event to the outbox for async processing via n8n.',
    inputSchema: objectSchema(
      {
        event_type: { type: 'string', description: 'Event type (e.g. opportunity.broadcast).' },
        aggregate_type: { type: 'string', description: 'Entity type (e.g. opportunity).' },
        aggregate_id: { type: 'string', description: 'Entity UUID.' },
        payload: { type: 'object', description: 'Event payload JSON.', additionalProperties: true },
        idempotency_key: { type: 'string', description: 'Dedup key for safe retries.' },
      },
      ['event_type', 'aggregate_type', 'aggregate_id', 'payload']
    ),
    outputSchema: idOutputSchema,
    destructive: true,
    requiredPermission: 'tenant:read',
  },
  {
    name: 'workflow_list_events',
    title: 'List Domain Events',
    description: 'List domain events from the outbox with status filters.',
    inputSchema: objectSchema(
      {
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
        aggregate_type: { type: 'string' },
        aggregate_id: { type: 'string' },
        ...paginationProperties,
      },
      []
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'workflow_get_event_status',
    title: 'Get Event Status',
    description: 'Retrieve processing status and error details for a domain event.',
    inputSchema: objectSchema({ event_id: { type: 'string' } }, ['event_id']),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'workflow_dispatch_n8n',
    title: 'Dispatch n8n Webhook',
    description: 'Trigger an n8n workflow webhook with a typed payload.',
    inputSchema: objectSchema(
      {
        workflow: {
          type: 'string',
          enum: [
            'opportunity-broadcast',
            'project-assigned',
            'milestone-reminders',
            'payment-notifications',
            'ai-talent-matching',
            'whatsapp-inbound',
          ],
        },
        payload: { type: 'object', additionalProperties: true },
      },
      ['workflow', 'payload']
    ),
    destructive: true,
    requiredPermission: 'integrations:manage',
  },
  {
    name: 'workflow_send_whatsapp',
    title: 'Send WhatsApp Message',
    description: 'Send a WhatsApp Cloud API message to a recipient.',
    inputSchema: objectSchema(
      {
        to: { type: 'string', description: 'E.164 phone number.' },
        template: { type: 'string', description: 'Approved template name.' },
        parameters: { type: 'array', items: { type: 'string' } },
        body: { type: 'string', description: 'Free-form body (session messages only).' },
      },
      ['to']
    ),
    destructive: true,
    requiredPermission: 'integrations:manage',
  },
  {
    name: 'workflow_retry_failed_events',
    title: 'Retry Failed Events',
    description: 'Re-queue failed domain events for processing.',
    inputSchema: objectSchema(
      {
        event_ids: { type: 'array', items: { type: 'string' }, description: 'Event UUIDs to retry.' },
        max_events: { type: 'number', description: 'Batch size limit. Default 50.' },
      },
      []
    ),
    destructive: true,
    requiredPermission: 'integrations:manage',
  },
] as const satisfies readonly McpToolDefinition[]

export type WorkflowToolName = (typeof WORKFLOW_TOOLS)[number]['name']

export interface WorkflowToolInputs {
  workflow_emit_event: {
    event_type: string
    aggregate_type: string
    aggregate_id: string
    payload: Record<string, unknown>
    idempotency_key?: string
  }
  workflow_list_events: {
    status?: string
    aggregate_type?: string
    aggregate_id?: string
    page?: number
    limit?: number
  }
  workflow_get_event_status: { event_id: string }
  workflow_dispatch_n8n: { workflow: string; payload: Record<string, unknown> }
  workflow_send_whatsapp: {
    to: string
    template?: string
    parameters?: string[]
    body?: string
  }
  workflow_retry_failed_events: { event_ids?: string[]; max_events?: number }
}

export const WORKFLOW_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'workflow',
    name: 'Talent OS Workflow',
    version: '1.0.0',
    description: 'Domain events, n8n orchestration, and WhatsApp messaging.',
    resourcePrefix: 'talentos://workflow',
  },
  capabilities: { tools: true, resources: true, prompts: false, logging: true },
  tools: WORKFLOW_TOOLS,
  resources: [
    {
      uri: 'talentos://workflow/events/{event_id}',
      name: 'Domain Event',
      mimeType: 'application/json',
    },
  ],
}

export interface WorkflowMcpServerInterface {
  readonly definition: typeof WORKFLOW_SERVER_DEFINITION
  listTools(): typeof WORKFLOW_TOOLS
}
