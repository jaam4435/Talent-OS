import { BaseRepository } from '@/lib/repositories/base/base.repository'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { CrmNote, CrmAttachment, CrmActivity, CrmActivityType } from '@/modules/crm/types'

export class CrmNoteRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    entity_type: string
    entity_id: string
    author_id: string | null
    body: string
  }): Promise<CrmNote> {
    const { data, error } = await this.ctx.supabase.from('crm_notes').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Note')
    return this.mapRow(data)
  }

  async listByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<CrmNote>> {
    const { limit, offset, page } = this.paginate(options)
    const { data, error, count } = await this.ctx.supabase
      .from('crm_notes')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((r) => this.mapRow(r)), { limit, page }, count ?? undefined)
  }

  private mapRow(row: Record<string, unknown>): CrmNote {
    return {
      id: row.id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      authorId: (row.author_id as string | null) ?? null,
      body: row.body as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}

export class CrmAttachmentRepository extends BaseRepository {
  async create(input: Record<string, unknown>): Promise<CrmAttachment> {
    const { data, error } = await this.ctx.supabase.from('crm_attachments').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Attachment')
    return this.mapRow(data)
  }

  async listByEntity(tenantId: string, entityType: string, entityId: string): Promise<CrmAttachment[]> {
    const { data, error } = await this.ctx.supabase
      .from('crm_attachments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  private mapRow(row: Record<string, unknown>): CrmAttachment {
    return {
      id: row.id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      fileName: row.file_name as string,
      filePath: row.file_path as string,
      mimeType: (row.mime_type as string | null) ?? null,
      sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
      createdAt: row.created_at as string,
    }
  }
}

export class CrmActivityRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    entity_type: string
    entity_id: string
    activity_type: CrmActivityType
    subject: string
    description?: string | null
    actor_id: string | null
    occurred_at?: string
  }): Promise<CrmActivity> {
    const { data, error } = await this.ctx.supabase.from('crm_activities').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Activity')
    return this.mapRow(data)
  }

  async listByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    options?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<CrmActivity>> {
    const { limit, offset, page } = this.paginate(options)
    const { data, error, count } = await this.ctx.supabase
      .from('crm_activities')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit - 1)

    this.throwIfError(error)
    return toPaginatedResult((data ?? []).map((r) => this.mapRow(r)), { limit, page }, count ?? undefined)
  }

  private mapRow(row: Record<string, unknown>): CrmActivity {
    return {
      id: row.id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      activityType: row.activity_type as CrmActivityType,
      subject: row.subject as string,
      description: (row.description as string | null) ?? null,
      actorId: (row.actor_id as string | null) ?? null,
      occurredAt: row.occurred_at as string,
      createdAt: row.created_at as string,
    }
  }
}
