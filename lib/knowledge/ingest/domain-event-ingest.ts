import { createOrgKnowledgeStore } from '@/lib/knowledge/org-knowledge'
import type { OrgKnowledgeSourceType, OrgKnowledgeStoreInput } from '@/modules/knowledge/types'
import { ORG_KNOWLEDGE_CATEGORY_MAP } from '@/modules/knowledge/types'
import type { KnowledgeService } from '@/lib/services/knowledge.service'

/** Domain events that auto-promote into organization knowledge. */
const PROMOTED_EVENTS: Record<
  string,
  { sourceType: Exclude<OrgKnowledgeSourceType, 'manual'>; titlePrefix: string }
> = {
  'project.milestone_submitted': { sourceType: 'deliverable', titlePrefix: 'Deliverable submitted' },
  'project.milestone_approved': { sourceType: 'deliverable', titlePrefix: 'Deliverable approved' },
  'crm.feedback_received': { sourceType: 'client_feedback', titlePrefix: 'Client feedback' },
  'project.status_changed': { sourceType: 'project_history', titlePrefix: 'Project update' },
}

export interface DomainEventIngestInput {
  eventId: string
  eventType: string
  payload: Record<string, unknown>
  aggregateId?: string
  projectId?: string
  companyId?: string
}

/**
 * Selectively promote domain events into organization knowledge.
 * Returns null when the event type is not configured for ingestion.
 */
export async function ingestDomainEvent(
  knowledge: KnowledgeService,
  tenantId: string,
  userId: string | null,
  input: DomainEventIngestInput
) {
  const config = PROMOTED_EVENTS[input.eventType]
  if (!config) return { ok: true as const, skipped: true as const }

  const store = createOrgKnowledgeStore(knowledge)
  const category = ORG_KNOWLEDGE_CATEGORY_MAP[config.sourceType]
  const title = `${config.titlePrefix}: ${input.aggregateId ?? input.eventId}`

  const payload: OrgKnowledgeStoreInput = {
    title,
    content: JSON.stringify(input.payload, null, 2),
    summary: `${input.eventType} captured for ${category}`,
    sourceId: input.eventId,
    sourceModule: 'events',
    links: {
      projectId: input.projectId,
      companyId: input.companyId,
      entityId: input.aggregateId,
    },
    metadata: {
      event_type: input.eventType,
      aggregate_id: input.aggregateId,
    },
  }

  const storeFn = {
    deliverable: store.storeDeliverable.bind(store),
    client_feedback: store.storeClientFeedback.bind(store),
    project_history: store.storeProjectHistory.bind(store),
  }[config.sourceType as 'deliverable' | 'client_feedback' | 'project_history']

  if (!storeFn) return { ok: true as const, skipped: true as const }

  const result = await storeFn(tenantId, userId, payload)
  return { ...result, skipped: false as const }
}

export function isPromotedDomainEvent(eventType: string): boolean {
  return eventType in PROMOTED_EVENTS
}
