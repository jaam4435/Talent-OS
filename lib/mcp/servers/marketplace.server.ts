import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { idOutputSchema, objectSchema, paginationProperties } from '@/lib/mcp/schemas/common'

export const MARKETPLACE_TOOLS = [
  {
    name: 'marketplace_search_profiles',
    title: 'Search Marketplace Profiles',
    description: 'Search talent profiles available for marketplace discovery.',
    inputSchema: objectSchema(
      {
        query: { type: 'string', description: 'Free-text search.' },
        discipline: {
          type: 'string',
          enum: ['design', 'video', 'copy', 'motion', 'brand', 'other'],
        },
        ...paginationProperties,
      },
      []
    ),
    requiredPermission: 'freelancers:read',
  },
  {
    name: 'marketplace_get_public_profile',
    title: 'Get Public Profile',
    description: 'Retrieve a marketplace-visible talent profile.',
    inputSchema: objectSchema({ freelancer_id: { type: 'string' } }, ['freelancer_id']),
    requiredPermission: 'freelancers:read',
  },
  {
    name: 'marketplace_get_match_scores',
    title: 'Get Match Scores',
    description: 'List AI match scores for an opportunity from the marketplace matching pool.',
    inputSchema: objectSchema({ opportunity_id: { type: 'string' } }, ['opportunity_id']),
    requiredPermission: 'ai:match',
  },
  {
    name: 'marketplace_request_match',
    title: 'Request Talent Match',
    description: 'Queue AI talent matching for an opportunity.',
    inputSchema: objectSchema({ opportunity_id: { type: 'string' } }, ['opportunity_id']),
    outputSchema: idOutputSchema,
    requiredPermission: 'ai:match',
  },
  {
    name: 'marketplace_list_boundaries',
    title: 'List Subdomain Boundaries',
    description: 'Return the marketplace subdomain boundary map for extension planning.',
    inputSchema: objectSchema({}, []),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'marketplace_get_boundary',
    title: 'Get Subdomain Boundary',
    description: 'Return boundary details for a single marketplace subdomain.',
    inputSchema: objectSchema(
      {
        subdomain: {
          type: 'string',
          enum: [
            'profiles',
            'availability',
            'ratings',
            'portfolio',
            'contracts',
            'invitations',
            'matching',
            'recommendations',
          ],
        },
      },
      ['subdomain']
    ),
    requiredPermission: 'tenant:read',
  },
] as const satisfies readonly McpToolDefinition[]

export type MarketplaceToolName = (typeof MARKETPLACE_TOOLS)[number]['name']

export interface MarketplaceToolInputs {
  marketplace_search_profiles: {
    query?: string
    discipline?: string
    page?: number
    limit?: number
  }
  marketplace_get_public_profile: { freelancer_id: string }
  marketplace_get_match_scores: { opportunity_id: string }
  marketplace_request_match: { opportunity_id: string }
  marketplace_list_boundaries: Record<string, never>
  marketplace_get_boundary: { subdomain: string }
}

export const MARKETPLACE_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'marketplace',
    name: 'Talent OS Marketplace',
    version: '1.0.0',
    description: 'Marketplace profiles, matching, and subdomain boundary orchestration.',
    resourcePrefix: 'talentos://marketplace',
  },
  capabilities: { tools: true, resources: true, prompts: false, logging: true },
  tools: MARKETPLACE_TOOLS,
  resources: [
    {
      uri: 'talentos://marketplace/profiles/{freelancer_id}',
      name: 'Public Marketplace Profile',
      mimeType: 'application/json',
    },
  ],
}

export interface MarketplaceMcpServerInterface {
  readonly definition: typeof MARKETPLACE_SERVER_DEFINITION
  listTools(): typeof MARKETPLACE_TOOLS
}
