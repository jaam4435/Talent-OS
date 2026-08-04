import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { TalentDocument, TalentDocumentType } from '@/modules/talent/types'

export class TalentDocumentRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    freelancer_id: string
    doc_type: TalentDocumentType
    file_name: string
    file_path: string
    mime_type?: string | null
    size_bytes?: number | null
  }): Promise<TalentDocument> {
    const { data, error } = await this.ctx.supabase
      .from('talent_documents')
      .insert(input)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Document')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<TalentDocument | null> {
    const { data, error } = await this.ctx.supabase
      .from('talent_documents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async listByFreelancer(freelancerId: string, tenantId: string): Promise<TalentDocument[]> {
    const { data, error } = await this.ctx.supabase
      .from('talent_documents')
      .select('*')
      .eq('freelancer_id', freelancerId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async countByFreelancer(freelancerId: string, tenantId: string): Promise<number> {
    const { count, error } = await this.ctx.supabase
      .from('talent_documents')
      .select('id', { count: 'exact', head: true })
      .eq('freelancer_id', freelancerId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    this.throwIfError(error)
    return count ?? 0
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('talent_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): TalentDocument {
    return {
      id: row.id as string,
      freelancerId: row.freelancer_id as string,
      docType: row.doc_type as TalentDocumentType,
      fileName: row.file_name as string,
      filePath: row.file_path as string,
      mimeType: (row.mime_type as string | null) ?? null,
      sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
