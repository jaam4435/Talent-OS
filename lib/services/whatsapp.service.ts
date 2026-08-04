import { getAiGateway } from '@/lib/ai'
import type { Repositories } from '@/lib/repositories/factory'
import type { CRMService } from '@/lib/services/crm.service'
import type { TalentService } from '@/lib/services/talent.service'
import type { WorkflowService } from '@/lib/services/workflow.service'
import type { ProjectService } from '@/lib/services/project.service'
import type { IntegrationService } from '@/lib/services/integration.service'
import { detectIntent } from '@/lib/whatsapp/intents'
import { handleWhatsAppIntent } from '@/lib/whatsapp/handlers'
import type {
  ConversationContext,
  InboundProcessResult,
  ParsedWhatsAppMessage,
} from '@/lib/whatsapp/types'
import type { Json } from '@/modules/core/types/database'

export class WhatsAppService {
  constructor(
    private readonly repos: Repositories,
    private readonly integration: IntegrationService,
    private readonly crm: CRMService,
    private readonly talent: TalentService,
    private readonly workflow: WorkflowService,
    private readonly project: ProjectService
  ) {}

  async resolveTenantByPhoneNumberId(phoneNumberId: string) {
    return this.integration.resolveTenantByWhatsAppPhoneNumberId(phoneNumberId)
  }

  async updateDeliveryStatus(waMessageId: string, status: string) {
    return this.integration.updateWhatsAppDeliveryStatus(waMessageId, status)
  }

  async getConversation(tenantId: string, freelancerId: string, phone: string): Promise<ConversationContext> {
    return this.repos.whatsappConversation.getOrCreate({
      tenant_id: tenantId,
      freelancer_id: freelancerId,
      phone,
    })
  }

  async clearActiveEntity(tenantId: string, freelancerId: string) {
    await this.repos.whatsappConversation.updateContext(tenantId, freelancerId, {
      active_intent: null,
      active_entity_type: null,
      active_entity_id: null,
    })
  }

  async setActiveOpportunity(tenantId: string, freelancerId: string, opportunityId: string) {
    await this.repos.whatsappConversation.updateContext(tenantId, freelancerId, {
      active_intent: 'opportunity.interested',
      active_entity_type: 'opportunity',
      active_entity_id: opportunityId,
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

    const conversation = await this.getConversation(tenantId, freelancer.id, message.phone)

    await this.integration.createInboundWhatsApp({
      tenant_id: tenantId,
      freelancer_id: freelancer.id,
      conversation_id: conversation.id,
      wa_message_id: message.waMessageId,
      phone: message.phone,
      body: message.body,
    })

    await this.repos.whatsappConversation.touchMessage(tenantId, freelancer.id, now)

    const pending = await this.crm.findPendingRecipient(tenantId, freelancer.id)
    if (pending) {
      await this.setActiveOpportunity(tenantId, freelancer.id, pending.opportunity_id)
    }

    const refreshedConversation = await this.getConversation(tenantId, freelancer.id, message.phone)
    const detected = detectIntent(message.body, refreshedConversation, message.buttonPayload)

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
      conversation: refreshedConversation,
      waMessageId: message.waMessageId,
    })

    if (handler.handled && handler.workflowEvent) {
      await this.workflow.emitEvent({
        tenantId,
        eventType: 'whatsapp.intent_handled',
        aggregateType: 'freelancer',
        aggregateId: freelancer.id,
        idempotencyKey: `whatsapp-intent:${message.waMessageId}:${detected.intent}`,
        actorId: userId,
        payload: {
          intent: detected.intent,
          workflow_event: handler.workflowEvent,
          ...(handler.data as Record<string, unknown>),
        },
      })
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
    query: string
    conversation: ConversationContext
  }): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    if (!getAiGateway().isConfigured()) {
      return { ok: false, error: 'agent_unavailable' }
    }

    try {
      const projects = await this.project.getFreelancerProjectSummary(
        input.freelancerId,
        input.tenantId
      )
      const pending = await this.crm.findPendingRecipient(input.tenantId, input.freelancerId)

      const response = await getAiGateway().complete({
        tenantId: input.tenantId,
        feature: 'digest',
        messages: [
          {
            role: 'system',
            content: `You are a WhatsApp assistant for freelancers on Talent OS. Be concise (under 320 chars). 
Freelancer: ${input.freelancerName}
Active projects: ${JSON.stringify(projects.slice(0, 3))}
Pending opportunity: ${pending ? pending.opportunity_id : 'none'}`,
          },
          { role: 'user', content: input.query },
        ],
      })

      await this.workflow.emitEvent({
        tenantId: input.tenantId,
        eventType: 'whatsapp.agent_requested',
        aggregateType: 'freelancer',
        aggregateId: input.freelancerId,
        idempotencyKey: `whatsapp-agent:${input.freelancerId}:${Date.now()}`,
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
      handler.intent === 'assignment.accept' ||
      handler.intent === 'assignment.reject' ||
      handler.intent === 'project.approve' ||
      handler.intent === 'milestone.approve' ||
      handler.intent === 'milestone.revision' ||
      handler.intent === 'deliverable.submit' ||
      handler.intent === 'approval.approve' ||
      handler.intent === 'approval.reject'
    ) {
      return {
        event: 'whatsapp.business_action',
        idempotencyKey: `wa-action:${message.waMessageId}:${handler.intent}`,
        data: {
          freelancer_id: freelancer.id,
          intent: handler.intent,
          ...handler.data,
        },
      }
    }

    return null
  }
}
