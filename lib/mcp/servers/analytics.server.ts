import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { objectSchema } from '@/lib/mcp/schemas/common'

export const ANALYTICS_TOOLS = [
  {
    name: 'analytics_dashboard_summary',
    title: 'Dashboard Summary',
    description: 'Retrieve high-level KPIs: active projects, open opportunities, talent count, pending payments.',
    inputSchema: objectSchema(
      {
        period: { type: 'string', enum: ['7d', '30d', '90d', 'ytd'], description: 'Summary period.' },
      },
      []
    ),
    requiredPermission: 'analytics:read',
  },
  {
    name: 'analytics_fill_rate',
    title: 'Opportunity Fill Rate',
    description: 'Calculate opportunity-to-project conversion and time-to-fill metrics.',
    inputSchema: objectSchema(
      {
        from_date: { type: 'string', description: 'ISO 8601 start date.' },
        to_date: { type: 'string', description: 'ISO 8601 end date.' },
        discipline: { type: 'string', enum: ['design', 'video', 'copy', 'motion', 'brand', 'other'] },
      },
      []
    ),
    requiredPermission: 'analytics:read',
  },
  {
    name: 'analytics_talent_utilization',
    title: 'Talent Utilization',
    description: 'Report on freelancer utilization, availability, and assignment load.',
    inputSchema: objectSchema(
      {
        discipline: { type: 'string', enum: ['design', 'video', 'copy', 'motion', 'brand', 'other'] },
        min_assignments: { type: 'number', description: 'Minimum active assignments to include.' },
      },
      []
    ),
    requiredPermission: 'analytics:read',
  },
  {
    name: 'analytics_payment_aging',
    title: 'Payment Aging Analytics',
    description: 'Analyze outstanding payment volumes by age bucket and freelancer.',
    inputSchema: objectSchema({}, []),
    requiredPermission: 'analytics:read',
  },
  {
    name: 'analytics_ai_usage',
    title: 'AI Usage Analytics',
    description: 'Summarize AI request volume, token usage, and estimated cost by feature.',
    inputSchema: objectSchema(
      {
        from_date: { type: 'string' },
        to_date: { type: 'string' },
        feature: {
          type: 'string',
          enum: [
            'talent_match',
            'brief_parse',
            'project_summary',
            'shortlist_summary',
            'status_assessment',
          ],
        },
      },
      []
    ),
    requiredPermission: 'analytics:read',
  },
  {
    name: 'analytics_pipeline_health',
    title: 'Pipeline Health',
    description: 'Opportunity pipeline metrics: open, stale, overdue responses, and shortlist conversion.',
    inputSchema: objectSchema({}, []),
    requiredPermission: 'analytics:read',
  },
] as const satisfies readonly McpToolDefinition[]

export type AnalyticsToolName = (typeof ANALYTICS_TOOLS)[number]['name']

export interface AnalyticsToolInputs {
  analytics_dashboard_summary: { period?: string }
  analytics_fill_rate: { from_date?: string; to_date?: string; discipline?: string }
  analytics_talent_utilization: { discipline?: string; min_assignments?: number }
  analytics_payment_aging: Record<string, never>
  analytics_ai_usage: { from_date?: string; to_date?: string; feature?: string }
  analytics_pipeline_health: Record<string, never>
}

export const ANALYTICS_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'analytics',
    name: 'Talent OS Analytics',
    version: '1.0.0',
    description: 'Operational KPIs, fill rate, utilization, and AI usage metrics.',
    resourcePrefix: 'talentos://analytics',
  },
  capabilities: { tools: true, resources: true, prompts: false, logging: true },
  tools: ANALYTICS_TOOLS,
  resources: [
    {
      uri: 'talentos://analytics/dashboard',
      name: 'Dashboard Summary',
      mimeType: 'application/json',
    },
    {
      uri: 'talentos://analytics/fill-rate',
      name: 'Fill Rate Report',
      mimeType: 'application/json',
    },
  ],
}

export interface AnalyticsMcpServerInterface {
  readonly definition: typeof ANALYTICS_SERVER_DEFINITION
  listTools(): typeof ANALYTICS_TOOLS
}
