/** Knowledge module domain types. */

export const KNOWLEDGE_CATEGORIES = [
  'meeting_note',
  'sop',
  'client_preference',
  'project_history',
  'deliverable',
  'feedback',
  'document',
] as const

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number]

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  meeting_note: 'Meeting Notes',
  sop: 'SOPs',
  client_preference: 'Client Preferences',
  project_history: 'Project History',
  deliverable: 'Deliverables',
  feedback: 'Feedback',
  document: 'Documents',
}

export type KnowledgeEmbeddingStatus = 'pending' | 'processing' | 'indexed' | 'failed' | 'skipped'

/** Default embedding dimensions (OpenAI text-embedding-3-small). */
export const KNOWLEDGE_EMBEDDING_DIMENSIONS = 1536

export interface KnowledgeEntryLinks {
  entityType?: string
  entityId?: string
  companyId?: string
  projectId?: string
  opportunityId?: string
  freelancerId?: string
  milestoneId?: string
}

export interface CreateKnowledgeEntryInput {
  category: KnowledgeCategory
  title: string
  content?: string | null
  summary?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
  links?: KnowledgeEntryLinks
  storage?: {
    bucket: string
    path: string
    mimeType?: string
    fileSizeBytes?: number
  }
}

export interface UpdateKnowledgeEntryInput {
  title?: string
  content?: string | null
  summary?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
  links?: KnowledgeEntryLinks
  embeddingStatus?: KnowledgeEmbeddingStatus
}

export interface KnowledgeSearchParams {
  query: string
  categories?: KnowledgeCategory[]
  entityType?: string
  entityId?: string
  limit?: number
  offset?: number
}

export interface CreateEmbeddingChunkInput {
  entryId: string
  chunkIndex: number
  content: string
  tokenCount?: number
  metadata?: Record<string, unknown>
}

/** For future AI pipeline — store vector when available. */
export interface StoreEmbeddingVectorInput {
  chunkId: string
  embedding: number[]
  model: string
  modelVersion?: string
}

export interface KnowledgeEntryRow {
  id: string
  tenant_id: string
  category: KnowledgeCategory
  title: string
  content: string | null
  summary: string | null
  entity_type: string | null
  entity_id: string | null
  company_id: string | null
  project_id: string | null
  opportunity_id: string | null
  freelancer_id: string | null
  milestone_id: string | null
  storage_bucket: string | null
  storage_path: string | null
  mime_type: string | null
  file_size_bytes: number | null
  tags: string[]
  metadata: Record<string, unknown>
  embedding_status: KnowledgeEmbeddingStatus
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface KnowledgeEmbeddingRow {
  id: string
  tenant_id: string
  entry_id: string
  chunk_index: number
  content: string
  token_count: number | null
  embedding: number[] | null
  model: string | null
  model_version: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface KnowledgeSearchResult {
  id: string
  category: KnowledgeCategory
  title: string
  summary: string | null
  content: string | null
  entityType: string | null
  entityId: string | null
  rank: number
}
