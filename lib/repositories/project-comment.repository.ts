import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { ProjectComment } from '@/modules/project/types'

export class ProjectCommentRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    project_id: string
    entity_type: string
    entity_id: string
    author_id: string | null
    body: string
  }): Promise<ProjectComment> {
    const { data, error } = await this.ctx.supabase.from('project_comments').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Comment')
    return this.mapRow(data)
  }

  async listByProject(projectId: string, tenantId: string, entityType?: string, entityId?: string): Promise<ProjectComment[]> {
    let query = this.ctx.supabase
      .from('project_comments')
      .select('*')
      .eq('project_id', projectId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (entityType) query = query.eq('entity_type', entityType)
    if (entityId) query = query.eq('entity_id', entityId)

    const { data, error } = await query
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('project_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): ProjectComment {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      authorId: (row.author_id as string | null) ?? null,
      body: row.body as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
