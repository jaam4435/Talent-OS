import type { Repositories } from '@/lib/repositories/factory'
import type { ConversationContext, WhatsAppIntent } from '@/lib/whatsapp/types'
import {
  appendConversationTurn,
  getAgentSessionId,
  getPinnedApprovalId,
  getRecentTurns,
  setAgentSessionId,
  setPinnedApprovalId,
  type ConversationTurn,
} from '@/lib/whatsapp/conversation-memory'

/** Manages WhatsApp session state — active entity pinning and turn history. */
export class ConversationContextManager {
  constructor(private readonly repos: Repositories) {}

  async load(tenantId: string, freelancerId: string, phone: string): Promise<ConversationContext> {
    return this.repos.whatsappConversation.getOrCreate({
      tenant_id: tenantId,
      freelancer_id: freelancerId,
      phone,
    })
  }

  async touch(tenantId: string, freelancerId: string, at: string): Promise<void> {
    await this.repos.whatsappConversation.touchMessage(tenantId, freelancerId, at)
  }

  async setActiveEntity(
    tenantId: string,
    freelancerId: string,
    input: {
      intent: WhatsAppIntent
      entityType: string
      entityId: string
    }
  ): Promise<void> {
    await this.repos.whatsappConversation.updateContext(tenantId, freelancerId, {
      active_intent: input.intent,
      active_entity_type: input.entityType,
      active_entity_id: input.entityId,
    })
  }

  async clearActiveEntity(tenantId: string, freelancerId: string): Promise<void> {
    await this.repos.whatsappConversation.updateContext(tenantId, freelancerId, {
      active_intent: null,
      active_entity_type: null,
      active_entity_id: null,
    })
  }

  async recordTurn(
    tenantId: string,
    freelancerId: string,
    conversation: ConversationContext,
    turn: ConversationTurn
  ): Promise<ConversationContext> {
    const context = appendConversationTurn(conversation.context, turn)
    await this.repos.whatsappConversation.updateContext(tenantId, freelancerId, { context })
    return { ...conversation, context }
  }

  getRecentTurns(conversation: ConversationContext, limit = 10): ConversationTurn[] {
    return getRecentTurns(conversation.context, limit)
  }

  getPinnedApprovalId(conversation: ConversationContext): string | null {
    return getPinnedApprovalId(conversation.context)
  }

  async pinApproval(
    tenantId: string,
    freelancerId: string,
    conversation: ConversationContext,
    approvalId: string
  ): Promise<ConversationContext> {
    const context = setPinnedApprovalId(conversation.context, approvalId)
    await this.repos.whatsappConversation.updateContext(tenantId, freelancerId, {
      active_intent: 'approval.resolve',
      active_entity_type: 'approval_request',
      active_entity_id: approvalId,
      context,
    })
    return {
      ...conversation,
      activeIntent: 'approval.resolve',
      activeEntityType: 'approval_request',
      activeEntityId: approvalId,
      context,
    }
  }

  async clearPinnedApproval(
    tenantId: string,
    freelancerId: string,
    conversation: ConversationContext
  ): Promise<ConversationContext> {
    const context = setPinnedApprovalId(conversation.context, null)
    await this.repos.whatsappConversation.updateContext(tenantId, freelancerId, {
      active_intent: null,
      active_entity_type: null,
      active_entity_id: null,
      context,
    })
    return {
      ...conversation,
      activeIntent: null,
      activeEntityType: null,
      activeEntityId: null,
      context,
    }
  }

  getAgentSessionId(conversation: ConversationContext): string | null {
    return getAgentSessionId(conversation.context)
  }

  async setAgentSessionId(
    tenantId: string,
    freelancerId: string,
    conversation: ConversationContext,
    sessionId: string
  ): Promise<ConversationContext> {
    const context = setAgentSessionId(conversation.context, sessionId)
    await this.repos.whatsappConversation.updateContext(tenantId, freelancerId, { context })
    return { ...conversation, context }
  }
}
