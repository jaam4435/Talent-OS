import { createServices } from '@/lib/services/factory'
import type { NotificationToolInputs, NotificationToolName } from '@/lib/mcp/servers/notification.server'
import type { McpExecutionContext, McpToolCallResult } from '@/lib/mcp/types'

export async function invokeNotificationTool<TName extends NotificationToolName>(
  toolName: TName,
  input: NotificationToolInputs[TName],
  context: McpExecutionContext
): Promise<McpToolCallResult> {
  const services = await createServices()

  switch (toolName) {
    case 'notification_list': {
      const params = input as NotificationToolInputs['notification_list']
      const result = await services.notificationModule.listNotifications(
        context.tenantId,
        context.userId,
        {
          page: params.page,
          limit: params.limit,
          unreadOnly: params.unread_only,
        }
      )
      return {
        content: {
          items: result.data,
          meta: services.notificationModule.buildListMeta(result, result.unreadCount),
        } as never,
      }
    }

    case 'notification_get': {
      const params = input as NotificationToolInputs['notification_get']
      const list = await services.notificationModule.listNotifications(
        context.tenantId,
        context.userId,
        { limit: 100 }
      )
      const item = list.data.find((row) => row.id === params.notification_id)
      if (!item) return { content: { error: 'Notification not found' } as never, isError: true }
      return { content: item as never }
    }

    case 'notification_mark_read': {
      const params = input as NotificationToolInputs['notification_mark_read']
      const result = await services.notificationModule.markRead(
        context.tenantId,
        context.userId,
        params.notification_id
      )
      if (!result.ok) return { content: { error: result.error } as never, isError: true }
      return { content: { read: true } as never }
    }

    case 'notification_mark_all_read': {
      const result = await services.notificationModule.markAllRead(context.tenantId, context.userId)
      return { content: result as never }
    }

    case 'notification_send': {
      const params = input as NotificationToolInputs['notification_send']
      const result = await services.notificationModule.create({
        tenant_id: context.tenantId,
        user_id: params.user_id,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        data: params.data,
      })
      return { content: result as never }
    }

    default:
      return {
        content: {
          error: 'Tool adapter not implemented',
          tool: toolName,
        } as never,
        isError: true,
      }
  }
}
