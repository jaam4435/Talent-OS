import { isDomainError } from '@/modules/core/utils/errors'
import type { Repositories } from '@/lib/repositories/factory'
import type {
  CreateEmbeddingChunkInput,
  CreateKnowledgeEntryInput,
  KnowledgeCategory,
  KnowledgeSearchParams,
  UpdateKnowledgeEntryInput,
} from '@/modules/knowledge/types'
import {
  createKnowledgeEntrySchema,
  updateKnowledgeEntrySchema,
  knowledgeSearchSchema,
} from '@/modules/knowledge/validation'
import type { PaginationParams } from '@/lib/repositories/base/types'

const DEFAULT_CHUNK_SIZE = 1500

export class KnowledgeService {
  constructor(private readonly repos: Repositories) {}

  async createEntry(
    tenantId: string,
    userId: string | null,
    input: CreateKnowledgeEntryInput
  ): Promise<{ ok: true; entryId: string } | { ok: false; error: string }> {
    const parsed = createKnowledgeEntrySchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      const entryId = await this.repos.knowledge.create(tenantId, userId, parsed.data)

      if (parsed.data.content && parsed.data.content.length > 0) {
        await this.prepareEmbeddingChunks(tenantId, entryId, parsed.data.content)
      } else {
        await this.repos.knowledge.updateEmbeddingStatus(entryId, tenantId, 'skipped')
      }

      return { ok: true, entryId }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Create failed' }
    }
  }

  async updateEntry(
    entryId: string,
    tenantId: string,
    userId: string | null,
    input: UpdateKnowledgeEntryInput
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = updateKnowledgeEntrySchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    try {
      await this.repos.knowledge.update(entryId, tenantId, userId, parsed.data)

      if (parsed.data.content !== undefined) {
        await this.repos.knowledgeEmbedding.deleteByEntry(entryId, tenantId)
        if (parsed.data.content && parsed.data.content.length > 0) {
          await this.prepareEmbeddingChunks(tenantId, entryId, parsed.data.content)
          await this.repos.knowledge.updateEmbeddingStatus(entryId, tenantId, 'pending')
        } else {
          await this.repos.knowledge.updateEmbeddingStatus(entryId, tenantId, 'skipped')
        }
      }

      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Update failed' }
    }
  }

  async deleteEntry(
    entryId: string,
    tenantId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await this.repos.knowledgeEmbedding.deleteByEntry(entryId, tenantId)
      await this.repos.knowledge.delete(entryId, tenantId)
      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Delete failed' }
    }
  }

  async getEntry(entryId: string, tenantId: string) {
    const entry = await this.repos.knowledge.findById(entryId, tenantId)
    if (!entry) return null

    const chunks = await this.repos.knowledgeEmbedding.listByEntry(entryId, tenantId)
    return { entry, chunks }
  }

  async listByCategory(tenantId: string, category: KnowledgeCategory, params?: PaginationParams) {
    return this.repos.knowledge.listByCategory(tenantId, category, params)
  }

  async listByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    params?: PaginationParams
  ) {
    return this.repos.knowledge.listByEntity(tenantId, entityType, entityId, params)
  }

  async listByProject(tenantId: string, projectId: string, params?: PaginationParams) {
    return this.repos.knowledge.listByProject(tenantId, projectId, params)
  }

  async listByCompany(tenantId: string, companyId: string, params?: PaginationParams) {
    return this.repos.knowledge.listByCompany(tenantId, companyId, params)
  }

  async listEntries(
    tenantId: string,
    params?: PaginationParams & { category?: KnowledgeCategory; query?: string }
  ) {
    return this.repos.knowledge.listEntries(tenantId, params)
  }

  async search(
    tenantId: string,
    params: KnowledgeSearchParams
  ): Promise<
    | { ok: true; results: import('@/modules/knowledge/types').KnowledgeSearchResult[] }
    | { ok: false; error: string }
  > {
    const parsed = knowledgeSearchSchema.safeParse(params)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid search' }
    }

    try {
      const results = await this.repos.knowledge.search(tenantId, parsed.data)
      return { ok: true, results }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Search failed' }
    }
  }

  /** Split content into chunks and store without vectors (ready for future embedding pipeline). */
  async prepareEmbeddingChunks(tenantId: string, entryId: string, content: string) {
    const chunks = splitIntoChunks(content, DEFAULT_CHUNK_SIZE)
    await this.repos.knowledgeEmbedding.createChunks(
      tenantId,
      entryId,
      chunks.map((text) => ({ content: text, tokenCount: estimateTokens(text) }))
    )
    await this.repos.knowledge.updateEmbeddingStatus(entryId, tenantId, 'pending')
  }

  async addEmbeddingChunk(tenantId: string, input: CreateEmbeddingChunkInput) {
    return this.repos.knowledgeEmbedding.createChunk(tenantId, input)
  }

  async listEmbeddings(entryId: string, tenantId: string) {
    return this.repos.knowledgeEmbedding.listByEntry(entryId, tenantId)
  }

  /**
   * Store a vector on a chunk — called by future AI embedding pipeline only.
   * Not invoked by any current code path.
   */
  async storeEmbeddingVector(
    chunkId: string,
    tenantId: string,
    entryId: string,
    embedding: number[],
    model: string,
    modelVersion?: string
  ) {
    await this.repos.knowledgeEmbedding.storeVector(chunkId, tenantId, embedding, model, modelVersion)

    const indexed = await this.repos.knowledgeEmbedding.countIndexedByEntry(entryId, tenantId)
    const total = (await this.repos.knowledgeEmbedding.listByEntry(entryId, tenantId)).length

    if (indexed >= total) {
      await this.repos.knowledge.updateEmbeddingStatus(entryId, tenantId, 'indexed')
    } else if (indexed > 0) {
      await this.repos.knowledge.updateEmbeddingStatus(entryId, tenantId, 'processing')
    }
  }

  /** Vector search — requires pre-computed query embedding from future AI pipeline. */
  async searchVector(
    tenantId: string,
    queryEmbedding: number[],
    options?: { categories?: KnowledgeCategory[]; limit?: number }
  ) {
    return this.repos.knowledgeEmbedding.searchVector(tenantId, queryEmbedding, options)
  }

  // Convenience creators per category (no duplicate storage logic)

  async createMeetingNote(
    tenantId: string,
    userId: string | null,
    input: Omit<CreateKnowledgeEntryInput, 'category'>
  ) {
    return this.createEntry(tenantId, userId, { ...input, category: 'meeting_note' })
  }

  async createSop(tenantId: string, userId: string | null, input: Omit<CreateKnowledgeEntryInput, 'category'>) {
    return this.createEntry(tenantId, userId, { ...input, category: 'sop' })
  }

  async createClientPreference(
    tenantId: string,
    userId: string | null,
    input: Omit<CreateKnowledgeEntryInput, 'category'>
  ) {
    return this.createEntry(tenantId, userId, { ...input, category: 'client_preference' })
  }

  async createProjectHistoryEntry(
    tenantId: string,
    userId: string | null,
    input: Omit<CreateKnowledgeEntryInput, 'category'>
  ) {
    return this.createEntry(tenantId, userId, { ...input, category: 'project_history' })
  }

  async createDeliverable(
    tenantId: string,
    userId: string | null,
    input: Omit<CreateKnowledgeEntryInput, 'category'>
  ) {
    return this.createEntry(tenantId, userId, { ...input, category: 'deliverable' })
  }

  async createFeedback(
    tenantId: string,
    userId: string | null,
    input: Omit<CreateKnowledgeEntryInput, 'category'>
  ) {
    return this.createEntry(tenantId, userId, { ...input, category: 'feedback' })
  }

  async createDocument(
    tenantId: string,
    userId: string | null,
    input: Omit<CreateKnowledgeEntryInput, 'category'>
  ) {
    return this.createEntry(tenantId, userId, { ...input, category: 'document' })
  }
}

function splitIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + maxLength, text.length)
    if (end < text.length) {
      const breakAt = text.lastIndexOf('\n', end)
      if (breakAt > start) end = breakAt + 1
    }
    chunks.push(text.slice(start, end).trim())
    start = end
  }

  return chunks.filter(Boolean)
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
