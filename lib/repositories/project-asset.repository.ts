import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { ProjectAsset, ProjectAssetType } from '@/modules/project/types'

export class ProjectAssetRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    project_id: string
    asset_type: ProjectAssetType
    name: string
    file_path?: string | null
    url?: string | null
    mime_type?: string | null
    size_bytes?: number | null
  }): Promise<ProjectAsset> {
    const { data, error } = await this.ctx.supabase.from('project_assets').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Asset')
    return this.mapRow(data)
  }

  async listByProject(projectId: string, tenantId: string): Promise<ProjectAsset[]> {
    const { data, error } = await this.ctx.supabase
      .from('project_assets')
      .select('*')
      .eq('project_id', projectId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('project_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): ProjectAsset {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      assetType: row.asset_type as ProjectAssetType,
      name: row.name as string,
      filePath: (row.file_path as string | null) ?? null,
      url: (row.url as string | null) ?? null,
      mimeType: (row.mime_type as string | null) ?? null,
      sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
