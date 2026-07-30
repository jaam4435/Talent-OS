import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { idOutputSchema, objectSchema, paginationProperties, tenantScopedInput } from '@/lib/mcp/schemas/common'

export const TALENT_TOOLS = [
  {
    name: 'talent_search',
    title: 'Search Talent',
    description: 'Search the agency talent roster with filters for discipline, skills, availability, rate, and rating.',
    inputSchema: objectSchema(
      {
        ...tenantScopedInput,
        query: { type: 'string', description: 'Free-text search across name, skills, bio.' },
        discipline: {
          type: 'string',
          enum: ['design', 'video', 'copy', 'motion', 'brand', 'other'],
        },
        availability: { type: 'string', enum: ['available', 'busy', 'unavailable'] },
        min_rate: { type: 'number' },
        max_rate: { type: 'number' },
        min_rating: { type: 'number', description: 'Minimum internal rating (1-5).' },
        sort: { type: 'string', enum: ['rating', 'name', 'rate_asc', 'rate_desc', 'active'] },
        ...paginationProperties,
      },
      []
    ),
    requiredPermission: 'freelancers:read',
  },
  {
    name: 'talent_get_profile',
    title: 'Get Talent Profile',
    description: 'Retrieve a freelancer profile by ID including skills, rates, and availability.',
    inputSchema: objectSchema(
      { freelancer_id: { type: 'string', description: 'Freelancer UUID.' } },
      ['freelancer_id']
    ),
    requiredPermission: 'freelancers:read',
  },
  {
    name: 'talent_create_profile',
    title: 'Create Talent Profile',
    description: 'Add a new freelancer to the agency roster.',
    inputSchema: objectSchema(
      {
        full_name: { type: 'string' },
        email: { type: 'string' },
        discipline: { type: 'string', enum: ['design', 'video', 'copy', 'motion', 'brand', 'other'] },
        skills: { type: 'array', items: { type: 'string' }, description: 'Skill tags.' },
        day_rate: { type: 'number' },
        availability: { type: 'string', enum: ['available', 'busy', 'unavailable'] },
        bio: { type: 'string' },
      },
      ['full_name', 'email', 'discipline', 'skills']
    ),
    outputSchema: idOutputSchema,
    destructive: true,
    requiredPermission: 'freelancers:create',
  },
  {
    name: 'talent_update_profile',
    title: 'Update Talent Profile',
    description: 'Update an existing freelancer profile.',
    inputSchema: objectSchema(
      {
        freelancer_id: { type: 'string' },
        full_name: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        day_rate: { type: 'number' },
        availability: { type: 'string', enum: ['available', 'busy', 'unavailable'] },
        internal_rating: { type: 'number', description: 'Manager-only rating (1-5).' },
        internal_notes: { type: 'string' },
      },
      ['freelancer_id']
    ),
    destructive: true,
    requiredPermission: 'freelancers:update',
  },
  {
    name: 'talent_list_portfolio',
    title: 'List Portfolio Items',
    description: 'List portfolio work samples for a freelancer.',
    inputSchema: objectSchema({ freelancer_id: { type: 'string' } }, ['freelancer_id']),
    requiredPermission: 'freelancers:read',
  },
  {
    name: 'talent_add_portfolio_item',
    title: 'Add Portfolio Item',
    description: 'Add a portfolio item to a freelancer profile.',
    inputSchema: objectSchema(
      {
        freelancer_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        project_url: { type: 'string' },
        image_path: { type: 'string', description: 'Storage path from storage MCP.' },
      },
      ['freelancer_id', 'title']
    ),
    outputSchema: idOutputSchema,
    destructive: true,
    requiredPermission: 'freelancers:update',
  },
  {
    name: 'talent_get_rating_history',
    title: 'Get Rating History',
    description: 'Retrieve internal rating history for a freelancer.',
    inputSchema: objectSchema({ freelancer_id: { type: 'string' } }, ['freelancer_id']),
    requiredPermission: 'freelancers:read',
  },
] as const satisfies readonly McpToolDefinition[]

export type TalentToolName = (typeof TALENT_TOOLS)[number]['name']

export interface TalentToolInputs {
  talent_search: {
    tenant_id?: string
    query?: string
    discipline?: string
    availability?: string
    min_rate?: number
    max_rate?: number
    min_rating?: number
    sort?: string
    page?: number
    limit?: number
  }
  talent_get_profile: { freelancer_id: string }
  talent_create_profile: {
    full_name: string
    email: string
    discipline: string
    skills: string[]
    day_rate?: number
    availability?: string
    bio?: string
  }
  talent_update_profile: {
    freelancer_id: string
    full_name?: string
    skills?: string[]
    day_rate?: number
    availability?: string
    internal_rating?: number
    internal_notes?: string
  }
  talent_list_portfolio: { freelancer_id: string }
  talent_add_portfolio_item: {
    freelancer_id: string
    title: string
    description?: string
    project_url?: string
    image_path?: string
  }
  talent_get_rating_history: { freelancer_id: string }
}

export const TALENT_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'talent',
    name: 'Talent OS Talent',
    version: '1.0.0',
    description: 'Freelancer roster, skills, portfolio, and internal ratings.',
    resourcePrefix: 'talentos://talent',
  },
  capabilities: { tools: true, resources: true, prompts: false, logging: true },
  tools: TALENT_TOOLS,
  resources: [
    {
      uri: 'talentos://talent/profiles/{freelancer_id}',
      name: 'Talent Profile',
      mimeType: 'application/json',
    },
    {
      uri: 'talentos://talent/portfolio/{freelancer_id}',
      name: 'Portfolio Gallery',
      mimeType: 'application/json',
    },
  ],
}

export interface TalentMcpServerInterface {
  readonly definition: typeof TALENT_SERVER_DEFINITION
  listTools(): typeof TALENT_TOOLS
}
