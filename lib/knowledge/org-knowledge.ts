import type {
  CreateKnowledgeEntryInput,
  KnowledgeCategory,
  OrgKnowledgeSourceType,
  OrgKnowledgeStoreInput,
} from '@/modules/knowledge/types'
import {
  ORG_KNOWLEDGE_CATEGORY_MAP,
  ORG_KNOWLEDGE_METADATA_KEYS,
} from '@/modules/knowledge/types'
import type { KnowledgeService } from '@/lib/services/knowledge.service'

export type OrgKnowledgeBucket =
  | 'meetings'
  | 'deliverables'
  | 'client_feedback'
  | 'brand_guides'
  | 'sops'
  | 'conversations'
  | 'ai_responses'
  | 'project_history'

const BUCKET_TO_SOURCE: Record<OrgKnowledgeBucket, Exclude<OrgKnowledgeSourceType, 'manual'>> = {
  meetings: 'meeting',
  deliverables: 'deliverable',
  client_feedback: 'client_feedback',
  brand_guides: 'brand_guide',
  sops: 'sop',
  conversations: 'conversation',
  ai_responses: 'ai_response',
  project_history: 'project_history',
}

/** Build metadata envelope for organization knowledge entries. */
export function buildOrgKnowledgeMetadata(
  sourceType: OrgKnowledgeSourceType,
  input: OrgKnowledgeStoreInput
): Record<string, unknown> {
  return {
    ...input.metadata,
    [ORG_KNOWLEDGE_METADATA_KEYS.sourceType]: sourceType,
    ...(input.sourceId ? { [ORG_KNOWLEDGE_METADATA_KEYS.sourceId]: input.sourceId } : {}),
    ...(input.sourceModule ? { [ORG_KNOWLEDGE_METADATA_KEYS.sourceModule]: input.sourceModule } : {}),
    [ORG_KNOWLEDGE_METADATA_KEYS.ingestedAt]: new Date().toISOString(),
  }
}

function toCreateInput(
  sourceType: Exclude<OrgKnowledgeSourceType, 'manual'>,
  input: OrgKnowledgeStoreInput
): CreateKnowledgeEntryInput {
  return {
    category: ORG_KNOWLEDGE_CATEGORY_MAP[sourceType],
    title: input.title,
    content: input.content,
    summary: input.summary,
    tags: input.tags,
    links: input.links,
    metadata: buildOrgKnowledgeMetadata(sourceType, input),
  }
}

/**
 * Typed organization knowledge store — delegates to KnowledgeService.
 * All ingestion paths should use this layer for consistent metadata.
 */
export class OrgKnowledgeStore {
  constructor(private readonly knowledge: KnowledgeService) {}

  async storeMeeting(tenantId: string, userId: string | null, input: OrgKnowledgeStoreInput) {
    return this.store(tenantId, userId, 'meeting', input)
  }

  async storeDeliverable(tenantId: string, userId: string | null, input: OrgKnowledgeStoreInput) {
    return this.store(tenantId, userId, 'deliverable', input)
  }

  async storeClientFeedback(tenantId: string, userId: string | null, input: OrgKnowledgeStoreInput) {
    return this.store(tenantId, userId, 'client_feedback', input)
  }

  async storeBrandGuide(tenantId: string, userId: string | null, input: OrgKnowledgeStoreInput) {
    return this.store(tenantId, userId, 'brand_guide', input)
  }

  async storeSop(tenantId: string, userId: string | null, input: OrgKnowledgeStoreInput) {
    return this.store(tenantId, userId, 'sop', input)
  }

  async storeConversation(tenantId: string, userId: string | null, input: OrgKnowledgeStoreInput) {
    return this.store(tenantId, userId, 'conversation', input)
  }

  async storeAiResponse(tenantId: string, userId: string | null, input: OrgKnowledgeStoreInput) {
    return this.store(tenantId, userId, 'ai_response', input)
  }

  async storeProjectHistory(tenantId: string, userId: string | null, input: OrgKnowledgeStoreInput) {
    return this.store(tenantId, userId, 'project_history', input)
  }

  async storeByBucket(
    tenantId: string,
    userId: string | null,
    bucket: OrgKnowledgeBucket,
    input: OrgKnowledgeStoreInput
  ) {
    return this.store(tenantId, userId, BUCKET_TO_SOURCE[bucket], input)
  }

  categoryForSource(sourceType: Exclude<OrgKnowledgeSourceType, 'manual'>): KnowledgeCategory {
    return ORG_KNOWLEDGE_CATEGORY_MAP[sourceType]
  }

  private async store(
    tenantId: string,
    userId: string | null,
    sourceType: Exclude<OrgKnowledgeSourceType, 'manual'>,
    input: OrgKnowledgeStoreInput
  ) {
    if (input.sourceId) {
      const existing = await this.knowledge.findBySource(tenantId, sourceType, input.sourceId)
      if (existing) {
        return { ok: true as const, entryId: existing.id, deduplicated: true }
      }
    }

    const result = await this.knowledge.createEntry(tenantId, userId, toCreateInput(sourceType, input))
    if (!result.ok) return result
    return { ok: true as const, entryId: result.entryId, deduplicated: false }
  }
}

export function createOrgKnowledgeStore(knowledge: KnowledgeService): OrgKnowledgeStore {
  return new OrgKnowledgeStore(knowledge)
}
