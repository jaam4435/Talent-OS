import { getAiGateway, globalPromptManager } from '@/lib/ai'
import type { Repositories } from '@/lib/repositories/factory'
import type { CRMService } from '@/lib/services/crm.service'
import type { TalentService } from '@/lib/services/talent.service'
import type { WorkflowService } from '@/lib/services/workflow.service'
import type { ProjectService } from '@/lib/services/project.service'
import type { IntegrationService } from '@/lib/services/integration.service'
import { ConversationContextManager } from '@/lib/whatsapp/conversation-context'
import { formatTurnsForPrompt } from '@/lib/whatsapp/conversation-memory'
import { detectIntent } from '@/lib/whatsapp/intents'
import { handleWhatsAppIntent } from '@/lib/whatsapp/handlers'
import { emitIntentHandledEvent } from '@/lib/whatsapp/workflow-bridge'
import type {
  ConversationContext,
  InboundProcessResult,
  ParsedWhatsAppMessage,
} from '@/lib/whatsapp/types'

export class WhatsAppService {
  private readonly conversation: ConversationContextManager

  constructor(
    private readonly repos: Repositories,
    private readonly integration: IntegrationService,
    private readonly crm: CRMService,
    private readonly talent: TalentService,
    private readonly workflow: WorkflowService,
    private readonly project: ProjectService
  ) {
    this.conversation = new ConversationContextManager(repos)
  }

  async resolveTenantByPhoneNumberId(phoneNumberId: string) {
    return this.integration.resolveTenantByWhatsAppPhoneNumberId(phoneNumberId)
  }

  async updateDeliveryStatus(waMessageId: string, status: string) {
    return this.integration.updateWhatsAppDeliveryStatus(waMessageId, status)
  }

  async getConversation(tenantId: string, freelancerId: string, phone: string): Promise<ConversationContext> {
    return this.conversation.load(tenantId, freelancerId, phone)
  }

  async clearActiveEntity(tenantId: string, freelancerId: string) {
    await this.conversation.clearActiveEntity(tenantId, freelancerId)
  }

  async pinApproval(
    tenantId: string,
    freelancerId: string,
    conversation: ConversationContext,
    approvalId: string
  ) {
    return this.conversation.pinApproval(tenantId, freelancerId, conversation, approvalId)
  }

  async setActiveOpportunity(tenantId: string, freelancerId: string, opportunityId: string) {
    await this.conversation.setActiveEntity(tenantId, freelancerId, {
      intent: 'opportunity.interested',
      entityType: 'opportunity',
      entityId: opportunityId,
    })
  }

  async processInboundMessage(input: {
    message: ParsedWhatsAppMessage
    tenantId: string
    freelancer: { id: string; full_name: string }
    services: import('@/lib/services/factory').Services
  }): Promise<InboundProcessResult> {
    const { message, tenantId, freelancer, services } = input
    const userId = await this.talent.findUserIdByFreelancerId(freelancer.id)
    const now = message.timestamp
      ? new Date(Number(message.timestamp) * 1000).toISOString()
      : new Date().toISOString()

    await this.integration.createInboundWhatsApp({
      tenant_id: tenantId,
      freelancer_id: freelancer.id,
      wa_message_id: message.waMessageId,
      phone: message.phone,
      body: message.body,
    })

    let conversation = await this.conversation.load(tenantId, freelancer.id, message.phone)
    await this.conversation.touch(tenantId, freelancer.id, now)

    conversation = await this.conversation.recordTurn(tenantId, freelancer.id, conversation, {
      role: 'user',
      content: message.body,
      at: now,
    })

    const pending = await this.crm.findPendingRecipient(tenantId, freelancer.id)
    if (pending) {
      await this.setActiveOpportunity(tenantId, freelancer.id, pending.opportunity_id)
      conversation = await this.conversation.load(tenantId, freelancer.id, message.phone)
    }

    const detected = detectIntent(message.body, conversation, message.buttonPayload)

    await this.workflow.emitEvent({
      tenantId,
      eventType: 'whatsapp.inbound',
      aggregateType: 'freelancer',
      aggregateId: freelancer.id,
      idempotencyKey: `whatsapp-inbound:${message.waMessageId}`,
      actorId: userId,
      payload: {
        wa_message_id: message.waMessageId,
        phone: message.phone,
        body: message.body,
        intent: detected.intent,
        confidence: detected.confidence,
        message_type: message.messageType,
      },
    })

    const handler = await handleWhatsAppIntent(services, {
      tenantId,
      freelancerId: freelancer.id,
      freelancerName: freelancer.full_name,
      userId,
      intent: detected,
      conversation,
      waMessageId: message.waMessageId,
    })

    await emitIntentHandledEvent(this.workflow, {
      tenantId,
      freelancerId: freelancer.id,
      userId,
      waMessageId: message.waMessageId,
      intent: detected.intent,
      handler,
    })

    if (handler.handled) {
      const assistantContent = summarizeHandlerResponse(handler)
      if (assistantContent) {
        await this.conversation.recordTurn(tenantId, freelancer.id, conversation, {
          role: 'assistant',
          content: assistantContent,
          at: new Date().toISOString(),
          intent: detected.intent,
        })
      }
    }

    return {
      waMessageId: message.waMessageId,
      tenantId,
      freelancerId: freelancer.id,
      intent: detected.intent,
      handler,
    }
  }

  async runAgentQuery(input: {
    tenantId: string
    freelancerId: string
    freelancerName: string
    userId: string | null
    query: string
    conversation: ConversationContext
  }): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    if (!getAiGateway().isConfigured()) {
      return { ok: false, error: 'agent_unavailable' }
    }

    try {
      const [projects, pending, recentTurns] = await Promise.all([
        this.project.getFreelancerProjectSummary(input.freelancerId, input.tenantId),
        this.crm.findPendingRecipient(input.tenantId, input.freelancerId),
        Promise.resolve(this.conversation.getRecentTurns(input.conversation, 8)),
      ])

      const userContext = {
        freelancer_name: input.freelancerName,
        active_projects: projects.slice(0, 3),
        pending_opportunity_id: pending?.opportunity_id ?? null,
        conversation_history: formatTurnsForPrompt(recentTurns),
        conversation_context: {
          active_intent: input.conversation.activeIntent,
          active_entity_type: input.conversation.activeEntityType,
          active_entity_id: input.conversation.activeEntityId,
        },
        query: input.query,
      }

      const built = globalPromptManager.build('whatsapp.agent', userContext)

      const response = await getAiGateway().complete({
        tenantId: input.tenantId,
        feature: 'digest',
        promptId: built.promptId,
        promptVersion: built.promptVersion,
        memory: {
          tenantId: input.tenantId,
          entityType: 'freelancer',
          entityId: input.freelancerId,
          scope: 'entity',
          limit: 5,
        },
        messages: [
          { role: 'system', content: built.system },
          { role: 'user', content: built.user },
        ],
      })

      await this.workflow.emitEvent({
        tenantId: input.tenantId,
        eventType: 'whatsapp.agent_requested',
        aggregateType: 'freelancer',
        aggregateId: input.freelancerId,
        idempotencyKey: `whatsapp-agent:${input.freelancerId}:${Date.now()}`,
        actorId: input.userId,
        payload: {
          query: input.query,
          response: response.content,
        },
      })

      return {
        ok: true,
        data: {
          response: response.content,
          provider: response.provider,
          model: response.model,
        },
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Agent query failed',
      }
    }
  }

  buildN8nPayload(
    result: InboundProcessResult,
    freelancer: { id: string; full_name: string },
    message: ParsedWhatsAppMessage
  ): { event: string; data: Record<string, unknown>; idempotencyKey: string } | null {
    const handler = result.handler
    if (!handler.handled) {
      return {
        event: 'whatsapp.unrecognized',
        idempotencyKey: `wa-unrecognized:${message.waMessageId}`,
        data: {
          freelancer_id: freelancer.id,
          phone: message.phone,
          body: message.body,
          intent: result.intent,
          reason: handler.reason,
        },
      }
    }

    if (handler.intent === 'opportunity.interested' || handler.intent === 'opportunity.declined') {
      return {
        event: 'whatsapp.response_processed',
        idempotencyKey: `wa-response:${handler.data.recipient_id}`,
        data: {
          freelancer_id: freelancer.id,
          freelancer_name: freelancer.full_name,
          response: handler.data.response,
          opportunity_id: handler.data.opportunity_id,
          recipient_id: handler.data.recipient_id,
          phone: message.phone,
        },
      }
    }

    if (handler.intent === 'agent.query' && handler.data.response) {
      return {
        event: 'whatsapp.agent_response',
        idempotencyKey: `wa-agent:${message.waMessageId}`,
        data: {
          freelancer_id: freelancer.id,
          phone: message.phone,
          query: message.body,
          response: handler.data.response,
        },
      }
    }

    if (handler.intent === 'help') {
      return {
        event: 'whatsapp.help',
        idempotencyKey: `wa-help:${message.waMessageId}`,
        data: {
          freelancer_id: freelancer.id,
          phone: message.phone,
          menu: handler.data.menu,
        },
      }
    }

    if (handler.intent === 'project.status') {
      return {
        event: 'whatsapp.project_status',
        idempotencyKey: `wa-status:${message.waMessageId}`,
        data: {
          freelancer_id: freelancer.id,
          phone: message.phone,
          projects: handler.data.projects,
        },
      }
    }

    if (handler.intent === 'milestone.submit' || handler.intent === 'milestone.start') {
      return {
        event: 'whatsapp.task_update',
        idempotencyKey: `wa-task:${message.waMessageId}`,
        data: {
          freelancer_id: freelancer.id,
          intent: handler.intent,
          ...handler.data,
        },
      }
    }

    if (
      handler.intent === 'opportunity.list' ||
      handler.intent === 'payment.status' ||
      handler.intent === 'notification.list' ||
      handler.intent === 'approval.list'
    ) {
      return {
        event: 'whatsapp.query_result',
        idempotencyKey: `wa-query:${message.waMessageId}`,
        data: {
          freelancer_id: freelancer.id,
          phone: message.phone,
          intent: handler.intent,
          ...handler.data,
        },
      }
    }

    if (
      handler.intent.startsWith('availability.') ||
      handler.intent === 'project.accept' ||
      handler.intent.startsWith('approval.') ||
      handler.intent.startsWith('milestone.review_')
    ) {
      return {
        event: 'whatsapp.action_completed',
        idempotencyKey: `wa-action:${message.waMessageId}`,
        data: {
          freelancer_id: freelancer.id,
          phone: message.phone,
          intent: handler.intent,
          ...handler.data,
        },
      }
    }

    return null
  }
}

function summarizeHandlerResponse(
  handler: InboundProcessResult['handler']
): string | null {
  if (!handler.handled) return null
  if (handler.intent === 'agent.query' && typeof handler.data.response === 'string') {
    return handler.data.response
  }
  if (handler.intent === 'help' && Array.isArray(handler.data.menu)) {
    return (handler.data.menu as string[]).join('\n')
  }
  return `Handled ${handler.intent}`
}
