import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { idOutputSchema, objectSchema, paginationProperties, tenantScopedInput } from '@/lib/mcp/schemas/common'

export const CRM_TOOLS = [
  {
    name: 'crm_list_companies',
    title: 'List Companies',
    description: 'List client companies for the tenant with optional search and pagination.',
    inputSchema: objectSchema(
      { ...tenantScopedInput, query: { type: 'string', description: 'Search by name or slug.' }, ...paginationProperties },
      []
    ),
    requiredPermission: 'companies:read',
  },
  {
    name: 'crm_get_company',
    title: 'Get Company',
    description: 'Retrieve a single company by ID including contact details.',
    inputSchema: objectSchema({ company_id: { type: 'string', description: 'Company UUID.' } }, ['company_id']),
    requiredPermission: 'companies:read',
  },
  {
    name: 'crm_create_company',
    title: 'Create Company',
    description: 'Create a new client company record.',
    inputSchema: objectSchema(
      {
        name: { type: 'string', description: 'Company display name.' },
        contact_email: { type: 'string', description: 'Primary contact email.' },
        contact_name: { type: 'string', description: 'Primary contact name.' },
        website: { type: 'string', description: 'Company website URL.' },
        notes: { type: 'string', description: 'Internal notes.' },
      },
      ['name']
    ),
    outputSchema: idOutputSchema,
    destructive: true,
    requiredPermission: 'companies:create',
  },
  {
    name: 'crm_update_company',
    title: 'Update Company',
    description: 'Update an existing company record.',
    inputSchema: objectSchema(
      {
        company_id: { type: 'string', description: 'Company UUID.' },
        name: { type: 'string' },
        contact_email: { type: 'string' },
        contact_name: { type: 'string' },
        website: { type: 'string' },
        notes: { type: 'string' },
      },
      ['company_id']
    ),
    destructive: true,
    requiredPermission: 'companies:update',
  },
  {
    name: 'crm_search_companies',
    title: 'Search Companies',
    description: 'Full-text search across company names, contacts, and notes.',
    inputSchema: objectSchema(
      {
        query: { type: 'string', description: 'Search query.' },
        ...paginationProperties,
      },
      ['query']
    ),
    requiredPermission: 'companies:read',
  },
] as const satisfies readonly McpToolDefinition[]

export type CrmToolName = (typeof CRM_TOOLS)[number]['name']

export interface CrmToolInputs {
  crm_list_companies: { tenant_id?: string; query?: string; page?: number; limit?: number }
  crm_get_company: { company_id: string }
  crm_create_company: {
    name: string
    contact_email?: string
    contact_name?: string
    website?: string
    notes?: string
  }
  crm_update_company: {
    company_id: string
    name?: string
    contact_email?: string
    contact_name?: string
    website?: string
    notes?: string
  }
  crm_search_companies: { query: string; page?: number; limit?: number }
}

export const CRM_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'crm',
    name: 'Talent OS CRM',
    version: '1.0.0',
    description: 'Client company management — contacts, accounts, and CRM search.',
    resourcePrefix: 'talentos://crm',
  },
  capabilities: { tools: true, resources: true, prompts: false, logging: true },
  tools: CRM_TOOLS,
  resources: [
    {
      uri: 'talentos://crm/companies/{company_id}',
      name: 'Company Record',
      description: 'Read-only company profile resource.',
      mimeType: 'application/json',
    },
  ],
}

/** CRM MCP server contract — implementation deferred to domain adapter. */
export interface CrmMcpServerInterface {
  readonly definition: typeof CRM_SERVER_DEFINITION
  listTools(): typeof CRM_TOOLS
}
