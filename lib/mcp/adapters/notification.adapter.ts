import type { NotificationToolInputs } from '@/lib/mcp/servers/notification.server'
import { mcpErr, mcpOk, paginate, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const NOTIFICATION_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  notification_list: async (input, ctx) => {
    const data = asInput<NotificationToolInputs['notification_list']>(input)
    const notifications = await ctx.services.notification.listByUser(
      ctx.execution.userId,
      ctx.execution.tenantId,
      data.unread_only ?? false
    )
    const filtered = data.type
      ? notifications.filter((n) => n.type === data.type)
      : notifications
    return mcpOk(paginate(filtered, data.page, data.limit))
  },

  notification_get: async (input, ctx) => {
    const { notification_id } = asInput<NotificationToolInputs['notification_get']>(input)
    const notification = await ctx.services.notification.getById(
      notification_id,
      ctx.execution.userId,
      ctx.execution.tenantId
    )
    if (!notification) return mcpErr('Notification not found', 'NOT_FOUND')
    return mcpOk(notification)
  },

  notification_mark_read: async (input, ctx) => {
    const { notification_id } = asInput<NotificationToolInputs['notification_mark_read']>(input)
    await ctx.services.notification.markRead(notification_id, ctx.execution.userId)
    return mcpOk({ id: notification_id, success: true })
  },

  notification_mark_all_read: async (_input, ctx) => {
    const result = await ctx.services.notification.markAllRead(
      ctx.execution.userId,
      ctx.execution.tenantId
    )
    return mcpOk(result)
  },

  notification_send: async (input, ctx) => {
    const data = asInput<NotificationToolInputs['notification_send']>(input)
    await ctx.services.notification.create({
      tenant_id: ctx.execution.tenantId,
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data,
    })
    return mcpOk({ success: true })
  },

  notification_subscribe_realtime: async (_input, ctx) => {
    const config = ctx.services.notification.getRealtimeConfig(
      ctx.execution.tenantId,
      ctx.execution.userId
    )
    return mcpOk(config)
  },
}
