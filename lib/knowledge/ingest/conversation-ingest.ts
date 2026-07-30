import { createOrgKnowledgeStore } from '@/lib/knowledge/org-knowledge'
import type { OrgKnowledgeStoreInput } from '@/modules/knowledge/types'
import type { KnowledgeService } from '@/lib/services/knowledge.service'

export interface ConversationIngestInput {
  conversationId: string
  title: string
  transcript: string
  channel?: string
  participantCount?: number
  projectId?: string
  companyId?: string
  metadata?: Record<string, unknown>
}

/** Promote a conversation transcript into organization knowledge. */
export async function ingestConversation(
  knowledge: KnowledgeService,
  tenantId: string,
  userId: string | null,
  input: ConversationIngestInput
) {
  const store = createOrgKnowledgeStore(knowledge)
  const payload: OrgKnowledgeStoreInput = {
    title: input.title,
    content: input.transcript,
    summary: input.channel ? `${input.channel} conversation` : 'Conversation transcript',
    sourceId: input.conversationId,
    sourceModule: 'conversations',
    tags: input.channel ? [input.channel] : undefined,
    links: {
      projectId: input.projectId,
      companyId: input.companyId,
    },
    metadata: {
      ...input.metadata,
      channel: input.channel,
      participant_count: input.participantCount,
    },
  }

  return store.storeConversation(tenantId, userId, payload)
}
