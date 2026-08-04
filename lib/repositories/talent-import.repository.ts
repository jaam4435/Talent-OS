import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { TalentImportBatch, TalentImportStatus } from '@/modules/talent/types'
import type { Json } from '@/modules/core/types/database'

export class TalentImportRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    uploaded_by: string | null
    file_name: string
    total_rows: number
  }): Promise<TalentImportBatch> {
    const { data, error } = await this.ctx.supabase
      .from('talent_import_batches')
      .insert({
        ...input,
        status: 'processing',
      })
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Import batch')
    return this.mapRow(data)
  }

  async findById(id: string, tenantId: string): Promise<TalentImportBatch | null> {
    const { data, error } = await this.ctx.supabase
      .from('talent_import_batches')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    this.throwIfError(error)
    return data ? this.mapRow(data) : null
  }

  async complete(
    id: string,
    tenantId: string,
    result: {
      status: TalentImportStatus
      success_count: number
      error_count: number
      errors: Array<{ row: number; message: string }>
    }
  ): Promise<TalentImportBatch> {
    const { data, error } = await this.ctx.supabase
      .from('talent_import_batches')
      .update({
        status: result.status,
        success_count: result.success_count,
        error_count: result.error_count,
        errors: result.errors as Json,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Import batch')
    return this.mapRow(data)
  }

  private mapRow(row: Record<string, unknown>): TalentImportBatch {
    return {
      id: row.id as string,
      fileName: row.file_name as string,
      status: row.status as TalentImportStatus,
      totalRows: row.total_rows as number,
      successCount: row.success_count as number,
      errorCount: row.error_count as number,
      errors: (row.errors as Array<{ row: number; message: string }>) ?? [],
      createdAt: row.created_at as string,
      completedAt: (row.completed_at as string | null) ?? null,
    }
  }
}
