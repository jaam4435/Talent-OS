/** Canonical knowledge domain event type strings. */
export const KnowledgeEvents = {
  ENTRY_CREATED: 'knowledge.entry_created',
  EMBEDDING_REQUESTED: 'knowledge.embedding_requested',
  EMBEDDING_COMPLETED: 'knowledge.embedding_completed',
} as const

export type KnowledgeEventType = (typeof KnowledgeEvents)[keyof typeof KnowledgeEvents]
