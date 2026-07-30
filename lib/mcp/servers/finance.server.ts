import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { objectSchema, paginationProperties } from '@/lib/mcp/schemas/common'

export const FINANCE_TOOLS = [
  {
    name: 'finance_list_payments',
    title: 'List Payments',
    description: 'List payment records with status, project, and freelancer filters.',
    inputSchema: objectSchema(
      {
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'processing', 'paid', 'disputed', 'canceled'],
        },
        project_id: { type: 'string' },
        freelancer_id: { type: 'string' },
        ...paginationProperties,
      },
      []
    ),
    requiredPermission: 'payments:read',
  },
  {
    name: 'finance_get_payment',
    title: 'Get Payment',
    description: 'Retrieve a single payment record with milestone and project context.',
    inputSchema: objectSchema({ payment_id: { type: 'string' } }, ['payment_id']),
    requiredPermission: 'payments:read',
  },
  {
    name: 'finance_approve_payment',
    title: 'Approve Payment',
    description: 'Manager approves a pending milestone payment for payout.',
    inputSchema: objectSchema(
      {
        payment_id: { type: 'string' },
        notes: { type: 'string' },
      },
      ['payment_id']
    ),
    destructive: true,
    requiredPermission: 'payments:approve',
  },
  {
    name: 'finance_mark_paid',
    title: 'Mark Payment Paid',
    description: 'Record that an approved payment has been disbursed.',
    inputSchema: objectSchema(
      {
        payment_id: { type: 'string' },
        payment_reference: { type: 'string', description: 'External payment reference or transaction ID.' },
        paid_at: { type: 'string', description: 'ISO 8601 timestamp. Defaults to now.' },
      },
      ['payment_id', 'payment_reference']
    ),
    destructive: true,
    requiredPermission: 'payments:pay',
  },
  {
    name: 'finance_dispute_payment',
    title: 'Dispute Payment',
    description: 'Flag a payment as disputed with a reason.',
    inputSchema: objectSchema(
      {
        payment_id: { type: 'string' },
        dispute_reason: { type: 'string' },
      },
      ['payment_id', 'dispute_reason']
    ),
    destructive: true,
    requiredPermission: 'payments:approve',
  },
  {
    name: 'finance_export_payments',
    title: 'Export Payments',
    description: 'Generate a CSV export of payments for accounting.',
    inputSchema: objectSchema(
      {
        from_date: { type: 'string', description: 'ISO 8601 start date.' },
        to_date: { type: 'string', description: 'ISO 8601 end date.' },
        status: { type: 'string', enum: ['pending', 'approved', 'processing', 'paid', 'disputed', 'canceled'] },
      },
      ['from_date', 'to_date']
    ),
    requiredPermission: 'payments:read',
  },
  {
    name: 'finance_payment_aging',
    title: 'Payment Aging Report',
    description: 'Summarize outstanding payments by age bucket.',
    inputSchema: objectSchema({}, []),
    requiredPermission: 'payments:read',
  },
] as const satisfies readonly McpToolDefinition[]

export type FinanceToolName = (typeof FINANCE_TOOLS)[number]['name']

export interface FinanceToolInputs {
  finance_list_payments: {
    status?: string
    project_id?: string
    freelancer_id?: string
    page?: number
    limit?: number
  }
  finance_get_payment: { payment_id: string }
  finance_approve_payment: { payment_id: string; notes?: string }
  finance_mark_paid: { payment_id: string; payment_reference: string; paid_at?: string }
  finance_dispute_payment: { payment_id: string; dispute_reason: string }
  finance_export_payments: { from_date: string; to_date: string; status?: string }
  finance_payment_aging: Record<string, never>
}

export const FINANCE_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'finance',
    name: 'Talent OS Finance',
    version: '1.0.0',
    description: 'Payment approval, disbursement tracking, and financial exports.',
    resourcePrefix: 'talentos://finance',
  },
  capabilities: { tools: true, resources: true, prompts: false, logging: true },
  tools: FINANCE_TOOLS,
  resources: [
    {
      uri: 'talentos://finance/payments/{payment_id}',
      name: 'Payment Record',
      mimeType: 'application/json',
    },
    {
      uri: 'talentos://finance/aging',
      name: 'Payment Aging Summary',
      mimeType: 'application/json',
    },
  ],
}

export interface FinanceMcpServerInterface {
  readonly definition: typeof FINANCE_SERVER_DEFINITION
  listTools(): typeof FINANCE_TOOLS
}
