import type { WorkflowToolInputs } from '@/lib/mcp/servers/workflow.server'
import { mcpErr, mcpOk, paginate, type McpToolHandlerFn } from '@/lib/mcp/adapters/helpers'

function asInput<T>(input: unknown): T {
  return input as T
}

export const WORKFLOW_ADAPTER_HANDLERS: Record<string, McpToolHandlerFn> = {
  workflow_emit_event: async (input, ctx) => {
    const data = asInput<WorkflowToolInputs['workflow_emit_event']>(input)
    const eventId = await ctx.services.workflow.emitEvent({
      tenantId: ctx.execution.tenantId,
      eventType: data.event_type,
      aggregateType: data.aggregate_type,
      aggregateId: data.aggregate_id,
      payload: data.payload,
      idempotencyKey: data.idempotency_key ?? `mcp:${data.event_type}:${crypto.randomUUID()}`,
      actorId: ctx.execution.userId,
      correlationId: ctx.execution.correlationId,
    })
    if (!eventId) return mcpErr('Failed to emit event')
    return mcpOk({ id: eventId })
  },

  workflow_list_events: async (input, ctx) => {
    const data = asInput<WorkflowToolInputs['workflow_list_events']>(input)
    const events = await ctx.services.workflow.listEvents(ctx.execution.tenantId, {
      status: data.status,
      aggregateType: data.aggregate_type,
      aggregateId: data.aggregate_id,
      limit: data.limit ?? 50,
    })
    return mcpOk(paginate(events, data.page, data.limit))
  },

  workflow_get_event_status: async (input, ctx) => {
    const { event_id } = asInput<WorkflowToolInputs['workflow_get_event_status']>(input)
    const event = await ctx.services.workflow.getEventById(event_id, ctx.execution.tenantId)
    if (!event) return mcpErr('Event not found', 'NOT_FOUND')
    return mcpOk(event)
  },

  workflow_dispatch_n8n: async (input, ctx) => {
    const data = asInput<WorkflowToolInputs['workflow_dispatch_n8n']>(input)
    const result = await ctx.services.workflow.dispatchN8n(
      ctx.execution.tenantId,
      data.workflow,
      data.payload,
      ctx.execution.userId
    )
    if (!result.ok) return mcpErr(result.error ?? 'n8n dispatch failed')
    return mcpOk({ success: true, status: result.status })
  },

  workflow_send_whatsapp: async (input, ctx) => {
    const data = asInput<WorkflowToolInputs['workflow_send_whatsapp']>(input)
    const eventId = await ctx.services.workflow.sendWhatsApp(
      ctx.execution.tenantId,
      {
        to: data.to,
        template: data.template,
        parameters: data.parameters,
        body: data.body,
      },
      ctx.execution.userId
    )
    if (!eventId) return mcpErr('Failed to queue WhatsApp message')
    return mcpOk({ id: eventId })
  },

  workflow_retry_failed_events: async (input, ctx) => {
    const data = asInput<WorkflowToolInputs['workflow_retry_failed_events']>(input)
    if (data.event_ids?.length) {
      await ctx.services.workflowEngine.retryFailedEvents(data.event_ids)
      return mcpOk({ retried: data.event_ids.length })
    }
    const pending = await ctx.services.workflow.listEvents(ctx.execution.tenantId, {
      status: 'failed',
      limit: data.max_events ?? 50,
    })
    const ids = pending.map((e) => e.id)
    if (ids.length) await ctx.services.workflowEngine.retryFailedEvents(ids)
    return mcpOk({ retried: ids.length })
  },
}
