import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { WorkflowDefinitionRecord } from '@/modules/workflow-engine/types'

export interface WorkflowDefinitionInput {
  tenant_id: string | null
  id: string
  name: string
  description?: string | null
  category?: string
  trigger_event_type: string
  conditions?: Record<string, unknown>[]
  steps: Record<string, unknown>[]
  compensation?: Record<string, unknown>[]
  queue_name?: string
  is_builtin?: boolean
  is_active?: boolean
}

export class WorkflowDefinitionRepository extends BaseRepository {
  async list(
    tenantId: string,
    options: { page?: number; limit?: number; activeOnly?: boolean; category?: string }
  ): Promise<PaginatedResult<WorkflowDefinitionRecord>> {
    const { limit, offset, page } = this.paginate(options)

    let query = this.ctx.supabase
      .from('workflow_definitions')
      .select('*', { count: 'exact' })
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('name')

    if (options.activeOnly !== false) query = query.eq('is_active', true)
    if (options.category) query = query.eq('category', options.category)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)

    return toPaginatedResult((data ?? []).map(this.mapRow), { limit, page }, count ?? undefined)
  }

  async findById(id: string, tenantId: string): Promise<WorkflowDefinitionRecord | null> {
    const { data } = await this.ctx.supabase
      .from('workflow_definitions')
      .select('*')
      .eq('id', id)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('tenant_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    return data ? this.mapRow(data) : null
  }

  async upsert(input: WorkflowDefinitionInput): Promise<WorkflowDefinitionRecord> {
    const { data, error } = await this.ctx.supabase
      .from('workflow_definitions')
      .upsert(
        {
          id: input.id,
          tenant_id: input.tenant_id,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? 'custom',
          trigger_event_type: input.trigger_event_type,
          conditions: (input.conditions ?? []) as Json,
          steps: input.steps as Json,
          compensation: (input.compensation ?? []) as Json,
          queue_name: input.queue_name ?? 'default',
          is_builtin: input.is_builtin ?? false,
          is_active: input.is_active ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id,tenant_id' }
      )
      .select('*')
      .single()

    this.throwIfError(error)
    if (!data) this.notFound('Workflow definition')
    return this.mapRow(data)
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    const { error } = await this.ctx.supabase
      .from('workflow_definitions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): WorkflowDefinitionRecord {
    return {
      id: row.id as string,
      tenantId: (row.tenant_id as string | null) ?? null,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      category: row.category as WorkflowDefinitionRecord['category'],
      triggerEventType: row.trigger_event_type as string,
      conditions: (row.conditions as Record<string, unknown>[]) ?? [],
      steps: (row.steps as WorkflowDefinitionRecord['steps']) ?? [],
      compensation: (row.compensation as WorkflowDefinitionRecord['compensation']) ?? [],
      queueName: row.queue_name as WorkflowDefinitionRecord['queueName'],
      isBuiltin: row.is_builtin as boolean,
      isActive: row.is_active as boolean,
      version: row.version as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
