import type { McpJsonSchema } from '@/lib/mcp/types'

export const tenantScopedInput = {
  tenant_id: {
    type: 'string' as const,
    description: 'Agency tenant UUID. Injected by gateway from session when omitted.',
  },
}

export const uuidProperty = (name: string, description: string): Record<string, McpJsonSchema> => ({
  [name]: { type: 'string', description },
})

export const paginationProperties: Record<string, McpJsonSchema> = {
  page: { type: 'number', description: 'Page number (1-based). Default 1.' },
  limit: { type: 'number', description: 'Results per page. Default 20, max 100.' },
}

export function objectSchema(
  properties: Record<string, McpJsonSchema>,
  required?: readonly string[]
): McpJsonSchema {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  }
}

export const emptyOutputSchema: McpJsonSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
  },
  required: ['success'],
}

export const idOutputSchema: McpJsonSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Created or affected entity UUID.' },
  },
  required: ['id'],
}
