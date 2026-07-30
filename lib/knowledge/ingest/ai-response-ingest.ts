import { createOrgKnowledgeStore } from '@/lib/knowledge/org-knowledge'
import type { OrgKnowledgeStoreInput } from '@/modules/knowledge/types'
import type { KnowledgeService } from '@/lib/services/knowledge.service'

export interface AiResponseIngestInput {
  aiRequestId: string
  title: string
  prompt: string
  response: string
  feature?: string
  model?: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

/** Promote an AI request/response pair into organization knowledge. */
export async function ingestAiResponse(
  knowledge: KnowledgeService,
  tenantId: string,
  userId: string | null,
  input: AiResponseIngestInput
) {
  const store = createOrgKnowledgeStore(knowledge)
  const content = [`## Prompt\n${input.prompt}`, `## Response\n${input.response}`].join('\n\n')

  const payload: OrgKnowledgeStoreInput = {
    title: input.title,
    content,
    summary: input.feature ? `AI ${input.feature} response` : 'AI response',
    sourceId: input.aiRequestId,
    sourceModule: 'ai',
    tags: input.feature ? [input.feature] : undefined,
    links: {
      entityType: input.entityType,
      entityId: input.entityId,
    },
    metadata: {
      ...input.metadata,
      feature: input.feature,
      model: input.model,
    },
  }

  return store.storeAiResponse(tenantId, userId, payload)
}
