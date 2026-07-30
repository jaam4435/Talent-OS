import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { objectSchema, paginationProperties } from '@/lib/mcp/schemas/common'

export const KNOWLEDGE_TOOLS = [
  {
    name: 'knowledge_get_entity_context',
    title: 'Get Entity Context',
    description: 'Assemble a structured context bundle for an entity (project, opportunity, talent) for agent reasoning.',
    inputSchema: objectSchema(
      {
        entity_type: {
          type: 'string',
          enum: ['project', 'opportunity', 'freelancer', 'company', 'payment'],
        },
        entity_id: { type: 'string' },
        depth: {
          type: 'string',
          enum: ['shallow', 'standard', 'deep'],
          description: 'How much related data to include.',
        },
      },
      ['entity_type', 'entity_id']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'knowledge_list_related_records',
    title: 'List Related Records',
    description: 'Find records related to an entity via foreign keys and activity logs.',
    inputSchema: objectSchema(
      {
        entity_type: { type: 'string' },
        entity_id: { type: 'string' },
        relation: {
          type: 'string',
          enum: ['milestones', 'payments', 'activity', 'notifications', 'match_scores', 'shortlist'],
        },
      },
      ['entity_type', 'entity_id', 'relation']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'knowledge_search',
    title: 'Search Knowledge Base',
    description: 'Full-text search across entity summaries, notes, and indexed documentation.',
    inputSchema: objectSchema(
      {
        query: { type: 'string' },
        entity_types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Limit search to specific entity types.',
        },
        ...paginationProperties,
      },
      ['query']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'knowledge_semantic_search',
    title: 'Semantic Search Knowledge Base',
    description:
      'Hybrid full-text + vector search across organization knowledge (meetings, SOPs, conversations, AI responses, etc.).',
    inputSchema: objectSchema(
      {
        query: { type: 'string' },
        categories: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'meeting_note',
              'sop',
              'client_preference',
              'project_history',
              'deliverable',
              'feedback',
              'document',
              'brand_guide',
              'conversation',
              'ai_response',
            ],
          },
        },
        limit: { type: 'number', description: 'Max results (default 10, max 50).' },
        ...paginationProperties,
      },
      ['query']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'knowledge_get_entry',
    title: 'Get Knowledge Entry',
    description: 'Retrieve a knowledge entry with its embedding chunks.',
    inputSchema: objectSchema(
      {
        entry_id: { type: 'string' },
      },
      ['entry_id']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'knowledge_create_entry',
    title: 'Create Knowledge Entry',
    description:
      'Store organization knowledge (meetings, deliverables, SOPs, brand guides, conversations, AI responses, project history).',
    inputSchema: objectSchema(
      {
        category: {
          type: 'string',
          enum: [
            'meeting_note',
            'sop',
            'client_preference',
            'project_history',
            'deliverable',
            'feedback',
            'document',
            'brand_guide',
            'conversation',
            'ai_response',
          ],
        },
        title: { type: 'string' },
        content: { type: 'string' },
        summary: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        source_id: { type: 'string', description: 'External source ID for deduplication.' },
        source_module: { type: 'string', description: 'Originating module (e.g. whatsapp, ai, events).' },
        project_id: { type: 'string' },
        company_id: { type: 'string' },
      },
      ['category', 'title']
    ),
    requiredPermission: 'tenant:write',
  },
  {
    name: 'knowledge_get_tenant_policies',
    title: 'Get Tenant Policies',
    description: 'Retrieve tenant settings, feature flags, and operational policies for agent guardrails.',
    inputSchema: objectSchema({}, []),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'knowledge_get_schema_reference',
    title: 'Get Schema Reference',
    description: 'Return a simplified schema reference for a domain entity type.',
    inputSchema: objectSchema(
      {
        entity_type: {
          type: 'string',
          enum: [
            'freelancer',
            'opportunity',
            'project',
            'milestone',
            'payment',
            'company',
            'notification',
          ],
        },
      },
      ['entity_type']
    ),
    requiredPermission: 'tenant:read',
  },
] as const satisfies readonly McpToolDefinition[]

export type KnowledgeToolName = (typeof KNOWLEDGE_TOOLS)[number]['name']

export interface KnowledgeToolInputs {
  knowledge_get_entity_context: {
    entity_type: string
    entity_id: string
    depth?: 'shallow' | 'standard' | 'deep'
  }
  knowledge_list_related_records: {
    entity_type: string
    entity_id: string
    relation: string
  }
  knowledge_search: {
    query: string
    entity_types?: string[]
    page?: number
    limit?: number
  }
  knowledge_semantic_search: {
    query: string
    categories?: string[]
    page?: number
    limit?: number
  }
  knowledge_get_entry: { entry_id: string }
  knowledge_create_entry: {
    category: string
    title: string
    content?: string
    summary?: string
    tags?: string[]
    source_id?: string
    source_module?: string
    project_id?: string
    company_id?: string
  }
  knowledge_get_tenant_policies: Record<string, never>
  knowledge_get_schema_reference: { entity_type: string }
}

export const KNOWLEDGE_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'knowledge',
    name: 'Talent OS Knowledge',
    version: '1.0.0',
    description: 'Entity context assembly, schema reference, and cross-domain search for AI agents.',
    resourcePrefix: 'talentos://knowledge',
  },
  capabilities: { tools: true, resources: true, prompts: true, logging: true },
  tools: KNOWLEDGE_TOOLS,
  resources: [
    {
      uri: 'talentos://knowledge/context/{entity_type}/{entity_id}',
      name: 'Entity Context Bundle',
      mimeType: 'application/json',
    },
    {
      uri: 'talentos://knowledge/schema/{entity_type}',
      name: 'Schema Reference',
      mimeType: 'application/json',
    },
  ],
  prompts: [
    {
      name: 'entity_summary',
      description: 'Generate a concise summary of an entity for agent context.',
      arguments: [
        { name: 'entity_type', required: true },
        { name: 'entity_id', required: true },
      ],
    },
  ],
}

export interface KnowledgeMcpServerInterface {
  readonly definition: typeof KNOWLEDGE_SERVER_DEFINITION
  listTools(): typeof KNOWLEDGE_TOOLS
}
