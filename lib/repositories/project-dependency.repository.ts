import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { ProjectDependency, ProjectDependencyEntity } from '@/modules/project/types'

export class ProjectDependencyRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    project_id: string
    predecessor_type: ProjectDependencyEntity
    predecessor_id: string
    successor_type: ProjectDependencyEntity
    successor_id: string
    notes?: string | null
  }): Promise<ProjectDependency> {
    const { data, error } = await this.ctx.supabase.from('project_dependencies').insert(input).select('*').single()
    this.throwIfError(error)
    if (!data) this.notFound('Dependency')
    return this.mapRow(data)
  }

  async listByProject(projectId: string, tenantId: string): Promise<ProjectDependency[]> {
    const { data, error } = await this.ctx.supabase
      .from('project_dependencies')
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
      .from('project_dependencies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): ProjectDependency {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      predecessorType: row.predecessor_type as ProjectDependencyEntity,
      predecessorId: row.predecessor_id as string,
      successorType: row.successor_type as ProjectDependencyEntity,
      successorId: row.successor_id as string,
      notes: (row.notes as string | null) ?? null,
      createdAt: row.created_at as string,
    }
  }
}
