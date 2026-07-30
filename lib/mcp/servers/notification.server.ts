import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { objectSchema, paginationProperties } from '@/lib/mcp/schemas/common'

export const NOTIFICATION_TOOLS = [
  {
    name: 'notification_list',
    title: 'List Notifications',
    description: 'List in-app notifications for the current user with read/unread filter.',
    inputSchema: objectSchema(
      {
        unread_only: { type: 'boolean', description: 'Filter to unread notifications only.' },
        type: { type: 'string', description: 'Filter by notification type.' },
        ...paginationProperties,
      },
      []
    ),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'notification_get',
    title: 'Get Notification',
    description: 'Retrieve a single notification by ID.',
    inputSchema: objectSchema({ notification_id: { type: 'string' } }, ['notification_id']),
    requiredPermission: 'tenant:read',
  },
  {
    name: 'notification_mark_read',
    title: 'Mark Notification Read',
    description: 'Mark a notification as read.',
    inputSchema: objectSchema({ notification_id: { type: 'string' } }, ['notification_id']),
    destructive: true,
    requiredPermission: 'tenant:read',
  },
  {
    name: 'notification_mark_all_read',
    title: 'Mark All Read',
    description: 'Mark all notifications as read for the current user.',
    inputSchema: objectSchema({}, []),
    destructive: true,
    requiredPermission: 'tenant:read',
  },
  {
    name: 'notification_send',
    title: 'Send Notification',
    description: 'Create and deliver an in-app notification to a user.',
    inputSchema: objectSchema(
      {
        user_id: { type: 'string', description: 'Target user UUID.' },
        type: { type: 'string', description: 'Notification type (e.g. system, payment, milestone).' },
        title: { type: 'string' },
        body: { type: 'string' },
        data: { type: 'object', description: 'Structured payload.', additionalProperties: true },
      },
      ['user_id', 'type', 'title']
    ),
    destructive: true,
    requiredPermission: 'tenant:read',
  },
  {
    name: 'notification_subscribe_realtime',
    title: 'Subscribe Realtime Channel',
    description: 'Return Realtime channel configuration for live notification streaming.',
    inputSchema: objectSchema({}, []),
    requiredPermission: 'tenant:read',
  },
] as const satisfies readonly McpToolDefinition[]

export type NotificationToolName = (typeof NOTIFICATION_TOOLS)[number]['name']

export interface NotificationToolInputs {
  notification_list: { unread_only?: boolean; type?: string; page?: number; limit?: number }
  notification_get: { notification_id: string }
  notification_mark_read: { notification_id: string }
  notification_mark_all_read: Record<string, never>
  notification_send: {
    user_id: string
    type: string
    title: string
    body?: string
    data?: Record<string, unknown>
  }
  notification_subscribe_realtime: Record<string, never>
}

export const NOTIFICATION_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'notification',
    name: 'Talent OS Notifications',
    version: '1.0.0',
    description: 'In-app notifications, read state, and Realtime delivery.',
    resourcePrefix: 'talentos://notifications',
  },
  capabilities: { tools: true, resources: true, prompts: false, logging: true },
  tools: NOTIFICATION_TOOLS,
  resources: [
    {
      uri: 'talentos://notifications/feed',
      name: 'Notification Feed',
      mimeType: 'application/json',
    },
  ],
}

export interface NotificationMcpServerInterface {
  readonly definition: typeof NOTIFICATION_SERVER_DEFINITION
  listTools(): typeof NOTIFICATION_TOOLS
}
