import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import type { ProjectTimelineEvent, ProjectTimelineEventType } from '@/modules/project/types'

export class ProjectTimelineRepository extends BaseRepository {
  async record(input: {
    tenant_id: string
    project_id: string
    event_type: ProjectTimelineEventType
    title: string
    description?: string | null
    actor_id?: string | null
    occurred_at?: string
    metadata?: Record<string, unknown>
  }): Promise<ProjectTimelineEvent> {
    const { data, error } = await this.ctx.supabase
      .from('project_timeline_events')
      .insert({
        ...input,
        metadata: (input.metadata ?? {}) as Json,
      })
      .select('*')
      .single()
    this.throwIfError(error)
    if (!data) this.notFound('Timeline event')
    return this.mapRow(data)
  }

  async listByProject(projectId: string, tenantId: string, limit = 50): Promise<ProjectTimelineEvent[]> {
    const { data, error } = await this.ctx.supabase
      .from('project_timeline_events')
      .select('*')
      .eq('project_id', projectId)
      .eq('tenant_id', tenantId)
      .order('occurred_at', { ascending: false })
      .limit(limit)
    this.throwIfError(error)
    return (data ?? []).map((r) => this.mapRow(r))
  }

  private mapRow(row: Record<string, unknown>): ProjectTimelineEvent {
    return {
      id: row.id as string,
      projectId: row.project_id as string,
      eventType: row.event_type as ProjectTimelineEventType,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      actorId: (row.actor_id as string | null) ?? null,
      occurredAt: row.occurred_at as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
    }
  }
}
