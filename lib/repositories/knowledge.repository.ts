import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { PaginationParams, PaginatedResult } from '@/lib/repositories/base/types'
import { toPaginatedResult } from '@/lib/repositories/base/types'
import type {
  CreateKnowledgeEntryInput,
  KnowledgeCategory,
  KnowledgeEmbeddingStatus,
  KnowledgeEntryRow,
  KnowledgeSearchParams,
  KnowledgeSearchResult,
  UpdateKnowledgeEntryInput,
} from '@/modules/knowledge/types'
import type { Json } from '@/modules/core/types/database'

function mapEntryRow(row: Record<string, unknown>): KnowledgeEntryRow {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    category: row.category as KnowledgeCategory,
    title: row.title as string,
    content: row.content as string | null,
    summary: row.summary as string | null,
    entity_type: row.entity_type as string | null,
    entity_id: row.entity_id as string | null,
    company_id: row.company_id as string | null,
    project_id: row.project_id as string | null,
    opportunity_id: row.opportunity_id as string | null,
    freelancer_id: row.freelancer_id as string | null,
    milestone_id: row.milestone_id as string | null,
    storage_bucket: row.storage_bucket as string | null,
    storage_path: row.storage_path as string | null,
    mime_type: row.mime_type as string | null,
    file_size_bytes: row.file_size_bytes as number | null,
    tags: (row.tags as string[]) ?? [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    embedding_status: row.embedding_status as KnowledgeEmbeddingStatus,
    created_by: row.created_by as string | null,
    updated_by: row.updated_by as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function linksToColumns(links?: CreateKnowledgeEntryInput['links']) {
  if (!links) return {}
  return {
    entity_type: links.entityType ?? null,
    entity_id: links.entityId ?? null,
    company_id: links.companyId ?? null,
    project_id: links.projectId ?? null,
    opportunity_id: links.opportunityId ?? null,
    freelancer_id: links.freelancerId ?? null,
    milestone_id: links.milestoneId ?? null,
  }
}

export class KnowledgeRepository extends BaseRepository {
  async create(
    tenantId: string,
    createdBy: string | null,
    input: CreateKnowledgeEntryInput
  ): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('knowledge_entries')
      .insert({
        tenant_id: tenantId,
        category: input.category,
        title: input.title,
        content: input.content ?? null,
        summary: input.summary ?? null,
        tags: input.tags ?? [],
        metadata: (input.metadata ?? {}) as Json,
        created_by: createdBy,
        updated_by: createdBy,
        storage_bucket: input.storage?.bucket ?? null,
        storage_path: input.storage?.path ?? null,
        mime_type: input.storage?.mimeType ?? null,
        file_size_bytes: input.storage?.fileSizeBytes ?? null,
        ...linksToColumns(input.links),
      })
      .select('id')
      .single()

    this.throwIfError(error)
    this.invalidateTable('knowledge_entries')
    if (!data?.id) this.notFound('Knowledge entry')
    return data.id
  }

  async findById(entryId: string, tenantId: string): Promise<KnowledgeEntryRow | null> {
    const { data } = await this.ctx.supabase
      .from('knowledge_entries')
      .select('*')
      .eq('id', entryId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    return data ? mapEntryRow(data) : null
  }

  async update(
    entryId: string,
    tenantId: string,
    updatedBy: string | null,
    input: UpdateKnowledgeEntryInput
  ): Promise<void> {
    const patch: Record<string, unknown> = { updated_by: updatedBy }
    if (input.title !== undefined) patch.title = input.title
    if (input.content !== undefined) patch.content = input.content
    if (input.summary !== undefined) patch.summary = input.summary
    if (input.tags !== undefined) patch.tags = input.tags
    if (input.metadata !== undefined) patch.metadata = input.metadata as Json
    if (input.embeddingStatus !== undefined) patch.embedding_status = input.embeddingStatus
    if (input.links) Object.assign(patch, linksToColumns(input.links))

    const { error } = await this.ctx.supabase
      .from('knowledge_entries')
      .update(patch as never)
      .eq('id', entryId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
    this.invalidateTable('knowledge_entries')
  }

  async delete(entryId: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('knowledge_entries')
      .delete()
      .eq('id', entryId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
    this.invalidateTable('knowledge_entries')
  }

  async listByCategory(
    tenantId: string,
    category: KnowledgeCategory,
    params?: PaginationParams
  ): Promise<PaginatedResult<KnowledgeEntryRow>> {
    const { limit, offset, page } = this.paginate(params)
    const { data, error, count } = await this.ctx.supabase
      .from('knowledge_entries')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map(mapEntryRow), { limit, page }, count ?? undefined)
  }

  async listByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<KnowledgeEntryRow>> {
    const { limit, offset, page } = this.paginate(params)
    const { data, error, count } = await this.ctx.supabase
      .from('knowledge_entries')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map(mapEntryRow), { limit, page }, count ?? undefined)
  }

  async listByProject(
    tenantId: string,
    projectId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<KnowledgeEntryRow>> {
    const { limit, offset, page } = this.paginate(params)
    const { data, error, count } = await this.ctx.supabase
      .from('knowledge_entries')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map(mapEntryRow), { limit, page }, count ?? undefined)
  }

  async listByCompany(
    tenantId: string,
    companyId: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<KnowledgeEntryRow>> {
    const { limit, offset, page } = this.paginate(params)
    const { data, error, count } = await this.ctx.supabase
      .from('knowledge_entries')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map(mapEntryRow), { limit, page }, count ?? undefined)
  }

  async search(tenantId: string, params: KnowledgeSearchParams): Promise<KnowledgeSearchResult[]> {
    const { data, error } = await this.ctx.supabase.rpc('search_knowledge_entries', {
      p_tenant_id: tenantId,
      p_query: params.query,
      p_categories: params.categories ?? null,
      p_entity_type: params.entityType ?? null,
      p_entity_id: params.entityId ?? null,
      p_limit: params.limit ?? 20,
      p_offset: params.offset ?? 0,
    })

    this.throwIfError(error)
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      category: row.category as KnowledgeCategory,
      title: row.title as string,
      summary: row.summary as string | null,
      content: row.content as string | null,
      entityType: row.entity_type as string | null,
      entityId: row.entity_id as string | null,
      rank: Number(row.rank),
    }))
  }

  async updateEmbeddingStatus(
    entryId: string,
    tenantId: string,
    status: KnowledgeEmbeddingStatus
  ): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('knowledge_entries')
      .update({ embedding_status: status })
      .eq('id', entryId)
      .eq('tenant_id', tenantId)

    this.throwIfError(error)
  }

  async findBySource(
    tenantId: string,
    sourceType: string,
    sourceId: string
  ): Promise<KnowledgeEntryRow | null> {
    const { data } = await this.ctx.supabase
      .from('knowledge_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('metadata->>source_type', sourceType)
      .eq('metadata->>source_id', sourceId)
      .maybeSingle()

    return data ? mapEntryRow(data) : null
  }

  /** Claim entries with pending embedding chunks (service-role worker). */
  async claimPendingEmbeddingJobs(limit = 20): Promise<
    Array<{ entryId: string; tenantId: string; category: KnowledgeCategory; title: string }>
  > {
    const { data, error } = await this.ctx.supabase.rpc('claim_knowledge_embedding_jobs', {
      p_limit: limit,
    })

    this.throwIfError(error)
    return (data ?? []).map((row: Record<string, unknown>) => ({
      entryId: row.entry_id as string,
      tenantId: row.tenant_id as string,
      category: row.category as KnowledgeCategory,
      title: row.title as string,
    }))
  }
}
