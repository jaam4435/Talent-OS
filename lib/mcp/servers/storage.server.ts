import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { objectSchema } from '@/lib/mcp/schemas/common'

export const STORAGE_TOOLS = [
  {
    name: 'storage_upload_file',
    title: 'Upload File',
    description: 'Upload a file to Supabase Storage and return the storage path.',
    inputSchema: objectSchema(
      {
        bucket: {
          type: 'string',
          enum: ['portfolio', 'deliverables', 'attachments'],
          description: 'Target storage bucket.',
        },
        path: { type: 'string', description: 'Destination path within bucket.' },
        content_base64: { type: 'string', description: 'Base64-encoded file content.' },
        content_type: { type: 'string', description: 'MIME type.' },
        upsert: { type: 'boolean', description: 'Overwrite if exists. Default false.' },
      },
      ['bucket', 'path', 'content_base64', 'content_type']
    ),
    destructive: true,
    requiredPermission: 'tenant:read',
  },
  {
    name: 'storage_get_signed_url',
    title: 'Get Signed URL',
    description: 'Generate a time-limited signed URL for private file access.',
    inputSchema: objectSchema(
      {
        bucket: { type: 'string', enum: ['portfolio', 'deliverables', 'attachments'] },
        path: { type: 'string' },
        expires_in_seconds: { type: 'number', description: 'URL TTL. Default 3600.' },
      },
      ['bucket', 'path']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'storage_get_public_url',
    title: 'Get Public URL',
    description: 'Return the public URL for a file in a public bucket.',
    inputSchema: objectSchema(
      {
        bucket: { type: 'string', enum: ['portfolio'] },
        path: { type: 'string' },
      },
      ['bucket', 'path']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'storage_delete_file',
    title: 'Delete File',
    description: 'Remove a file from storage.',
    inputSchema: objectSchema(
      {
        bucket: { type: 'string', enum: ['portfolio', 'deliverables', 'attachments'] },
        path: { type: 'string' },
      },
      ['bucket', 'path']
    ),
    destructive: true,
    requiredPermission: 'tenant:read',
  },
  {
    name: 'storage_list_files',
    title: 'List Files',
    description: 'List files in a storage bucket path prefix.',
    inputSchema: objectSchema(
      {
        bucket: { type: 'string', enum: ['portfolio', 'deliverables', 'attachments'] },
        prefix: { type: 'string', description: 'Path prefix filter.' },
        limit: { type: 'number', description: 'Max results. Default 100.' },
      },
      ['bucket']
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'storage_move_file',
    title: 'Move File',
    description: 'Move or rename a file within a bucket.',
    inputSchema: objectSchema(
      {
        bucket: { type: 'string', enum: ['portfolio', 'deliverables', 'attachments'] },
        from_path: { type: 'string' },
        to_path: { type: 'string' },
      },
      ['bucket', 'from_path', 'to_path']
    ),
    destructive: true,
    requiredPermission: 'tenant:read',
  },
] as const satisfies readonly McpToolDefinition[]

export type StorageToolName = (typeof STORAGE_TOOLS)[number]['name']

export interface StorageToolInputs {
  storage_upload_file: {
    bucket: string
    path: string
    content_base64: string
    content_type: string
    upsert?: boolean
  }
  storage_get_signed_url: {
    bucket: string
    path: string
    expires_in_seconds?: number
  }
  storage_get_public_url: { bucket: string; path: string }
  storage_delete_file: { bucket: string; path: string }
  storage_list_files: { bucket: string; prefix?: string; limit?: number }
  storage_move_file: { bucket: string; from_path: string; to_path: string }
}

export const STORAGE_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'storage',
    name: 'Talent OS Storage',
    version: '1.0.0',
    description: 'Supabase Storage operations for portfolio, deliverables, and attachments.',
    resourcePrefix: 'talentos://storage',
  },
  capabilities: { tools: true, resources: true, prompts: false, logging: true },
  tools: STORAGE_TOOLS,
  resources: [
    {
      uri: 'talentos://storage/{bucket}/{path}',
      name: 'Stored File',
      description: 'Reference to a file in Supabase Storage.',
    },
  ],
}

export interface StorageMcpServerInterface {
  readonly definition: typeof STORAGE_SERVER_DEFINITION
  listTools(): typeof STORAGE_TOOLS
}
