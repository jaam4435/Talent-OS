import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { idOutputSchema, objectSchema } from '@/lib/mcp/schemas/common'

export const AI_TOOLS = [
  {
    name: 'ai_match_talent',
    title: 'AI Talent Match',
    description: 'Rank freelancers against an opportunity using the AI Gateway. Returns match scores and rationale.',
    inputSchema: objectSchema(
      {
        opportunity_id: { type: 'string', description: 'Opportunity UUID.' },
        async: { type: 'boolean', description: 'Queue async execution. Default true.' },
      },
      ['opportunity_id']
    ),
    outputSchema: idOutputSchema,
    requiredPermission: 'ai:match',
  },
  {
    name: 'ai_parse_brief',
    title: 'AI Parse Brief',
    description: 'Extract structured requirements from an opportunity brief.',
    inputSchema: objectSchema(
      {
        title: { type: 'string' },
        description: { type: 'string' },
        budget: { type: 'number' },
        currency: { type: 'string' },
        async: { type: 'boolean' },
      },
      ['title']
    ),
    requiredPermission: 'ai:brief_parse',
  },
  {
    name: 'ai_project_summary',
    title: 'AI Project Summary',
    description: 'Generate an AI project health summary with highlights, blockers, and next actions.',
    inputSchema: objectSchema(
      {
        project_id: { type: 'string' },
        async: { type: 'boolean' },
      },
      ['project_id']
    ),
    requiredPermission: 'ai:summary',
  },
  {
    name: 'ai_shortlist_summary',
    title: 'AI Shortlist Summary',
    description: 'Compare shortlisted candidates and recommend the best fit.',
    inputSchema: objectSchema(
      {
        opportunity_id: { type: 'string' },
        async: { type: 'boolean' },
      },
      ['opportunity_id']
    ),
    requiredPermission: 'ai:summary',
  },
  {
    name: 'ai_status_assessment',
    title: 'AI Status Assessment',
    description: 'Assess project delivery risk and suggest status transitions.',
    inputSchema: objectSchema(
      {
        project_id: { type: 'string' },
        async: { type: 'boolean' },
      },
      ['project_id']
    ),
    requiredPermission: 'ai:status',
  },
  {
    name: 'ai_get_request_status',
    title: 'Get AI Request Status',
    description: 'Poll the status and result of an async AI request.',
    inputSchema: objectSchema(
      { ai_request_id: { type: 'string' } },
      ['ai_request_id']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'ai_complete',
    title: 'AI Complete (Gateway)',
    description: 'Low-level passthrough to the AI Gateway for custom structured completions. All LLM calls must use this tool.',
    inputSchema: objectSchema(
      {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['system', 'user', 'assistant'] },
              content: { type: 'string' },
            },
            required: ['role', 'content'],
          },
        },
        schema: {
          type: 'object',
          description: 'JSON Schema for structured output.',
          additionalProperties: true,
        },
        feature: {
          type: 'string',
          enum: [
            'talent_match',
            'brief_parse',
            'project_summary',
            'shortlist_summary',
            'status_assessment',
            'digest',
          ],
        },
        prompt_id: { type: 'string', description: 'Registered prompt ID for versioning.' },
        prompt_version: { type: 'string' },
        provider: { type: 'string', enum: ['openai', 'anthropic', 'gemini', 'openrouter'] },
        temperature: { type: 'number' },
      },
      ['messages', 'feature']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'ai_list_prompts',
    title: 'List AI Prompts',
    description: 'List registered prompt templates and versions from the AI Gateway Prompt Manager.',
    inputSchema: objectSchema({}, []),
    requiredPermission: 'tenant:read',
  },
] as const satisfies readonly McpToolDefinition[]

export type AiToolName = (typeof AI_TOOLS)[number]['name']

export interface AiToolInputs {
  ai_match_talent: { opportunity_id: string; async?: boolean }
  ai_parse_brief: {
    title: string
    description?: string
    budget?: number
    currency?: string
    async?: boolean
  }
  ai_project_summary: { project_id: string; async?: boolean }
  ai_shortlist_summary: { opportunity_id: string; async?: boolean }
  ai_status_assessment: { project_id: string; async?: boolean }
  ai_get_request_status: { ai_request_id: string }
  ai_complete: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    schema?: Record<string, unknown>
    feature: string
    prompt_id?: string
    prompt_version?: string
    provider?: string
    temperature?: number
  }
  ai_list_prompts: Record<string, never>
}

export const AI_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'ai',
    name: 'Talent OS AI',
    version: '1.0.0',
    description: 'AI Gateway passthrough — matching, PM features, and structured completions. No direct LLM calls.',
    resourcePrefix: 'talentos://ai',
  },
  capabilities: { tools: true, resources: true, prompts: true, logging: true },
  tools: AI_TOOLS,
  resources: [
    {
      uri: 'talentos://ai/requests/{ai_request_id}',
      name: 'AI Request Record',
      mimeType: 'application/json',
    },
    {
      uri: 'talentos://ai/prompts/{prompt_id}',
      name: 'Prompt Template',
      mimeType: 'application/json',
    },
  ],
  prompts: [
    {
      name: 'talent_match',
      description: 'Rank talent for an opportunity.',
      arguments: [{ name: 'opportunity_id', required: true }],
    },
    {
      name: 'brief_parse',
      description: 'Parse a client brief into structured requirements.',
      arguments: [{ name: 'title', required: true }, { name: 'description', required: false }],
    },
  ],
}

export interface AiMcpServerInterface {
  readonly definition: typeof AI_SERVER_DEFINITION
  listTools(): typeof AI_TOOLS
}
