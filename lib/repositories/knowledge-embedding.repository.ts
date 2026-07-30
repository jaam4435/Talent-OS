import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type {
  CreateEmbeddingChunkInput,
  KnowledgeCategory,
  KnowledgeEmbeddingRow,
} from '@/modules/knowledge/types'
import type { Json } from '@/modules/core/types/database'

function mapEmbeddingRow(row: Record<string, unknown>): KnowledgeEmbeddingRow {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    entry_id: row.entry_id as string,
    chunk_index: row.chunk_index as number,
    content: row.content as string,
    token_count: row.token_count as number | null,
    embedding: row.embedding as number[] | null,
    model: row.model as string | null,
    model_version: row.model_version as string | null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
  }
}

export class KnowledgeEmbeddingRepository extends BaseRepository {
  async createChunk(
    tenantId: string,
    input: CreateEmbeddingChunkInput
  ): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('knowledge_embeddings')
      .insert({
        tenant_id: tenantId,
        entry_id: input.entryId,
        chunk_index: input.chunkIndex,
        content: input.content,
        token_count: input.tokenCount ?? null,
        metadata: (input.metadata ?? {}) as Json,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Knowledge embedding chunk')
    return data.id
  }

  async createChunks(
    tenantId: string,
    entryId: string,
    chunks: Array<{ content: string; tokenCount?: number; metadata?: Record<string, unknown> }>
  ): Promise<string[]> {
    if (!chunks.length) return []

    const rows = chunks.map((chunk, index) => ({
      tenant_id: tenantId,
      entry_id: entryId,
      chunk_index: index,
      content: chunk.content,
      token_count: chunk.tokenCount ?? null,
      metadata: (chunk.metadata ?? {}) as Json,
    }))

    const { data, error } = await this.ctx.supabase
      .from('knowledge_embeddings')
      .insert(rows)
      .select('id')

    this.throwIfError(error)
    return (data ?? []).map((r) => r.id as string)
  }

  async listByEntry(entryId: string, tenantId: string): Promise<KnowledgeEmbeddingRow[]> {
    const { data, error } = await this.ctx.supabase
      .from('knowledge_embeddings')
      .select('*')
      .eq('entry_id', entryId)
      .eq('tenant_id', tenantId)
      .order('chunk_index')

    this.throwIfError(error)
    return (data ?? []).map(mapEmbeddingRow)
  }

  async storeVector(
    chunkId: string,
    tenantId: string,
    embedding: number[],
    model: string,
    modelVersion?: string
  ): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('knowledge_embeddings')
      .update({
        embedding: `[${embedding.join(',')}]`,
        model,
        model_version: modelVersion ?? null,
      })
      .eq('id', chunkId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }

  async deleteByEntry(entryId: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('knowledge_embeddings')
      .delete()
      .eq('entry_id', entryId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }

  async countIndexedByEntry(entryId: string, tenantId: string): Promise<number> {
    const { count, error } = await this.ctx.supabase
      .from('knowledge_embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('entry_id', entryId)
      .eq('tenant_id', tenantId)
      .not('embedding', 'is', null)

    this.throwIfError(error)
    return count ?? 0
  }

  async listChunksWithoutEmbedding(
    entryId: string,
    tenantId: string
  ): Promise<KnowledgeEmbeddingRow[]> {
    const { data, error } = await this.ctx.supabase
      .from('knowledge_embeddings')
      .select('*')
      .eq('entry_id', entryId)
      .eq('tenant_id', tenantId)
      .is('embedding', null)
      .order('chunk_index')

    this.throwIfError(error)
    return (data ?? []).map(mapEmbeddingRow)
  }

  /** Vector similarity search — requires query embedding from future AI pipeline. */
  async searchVector(
    tenantId: string,
    queryEmbedding: number[],
    options?: { categories?: KnowledgeCategory[]; limit?: number }
  ) {
    const { data, error } = await this.ctx.supabase.rpc('search_knowledge_vector', {
      p_tenant_id: tenantId,
      p_query_embedding: `[${queryEmbedding.join(',')}]`,
      p_categories: options?.categories ?? null,
      p_limit: options?.limit ?? 10,
    })

    this.throwIfError(error)
    return data ?? []
  }
}
