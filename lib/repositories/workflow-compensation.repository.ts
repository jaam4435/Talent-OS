import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { WorkflowCompensationRecord } from '@/modules/workflow-engine/types'

export class WorkflowCompensationRepository extends BaseRepository {
  async create(input: {
    tenant_id: string
    run_id: string
    job_id?: string | null
    step_id: string
    action_type: string
    config?: Record<string, unknown>
    max_retries?: number
  }): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('workflow_compensations')
      .insert({
        tenant_id: input.tenant_id,
        run_id: input.run_id,
        job_id: input.job_id ?? null,
        step_id: input.step_id,
        action_type: input.action_type,
        config: (input.config ?? {}) as Json,
        max_retries: input.max_retries ?? 3,
        status: 'pending',
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Workflow compensation')
    return data.id
  }

  async list(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      runId?: string
      status?: WorkflowCompensationRecord['status']
    }
  ): Promise<PaginatedResult<WorkflowCompensationRecord>> {
    const { limit, offset, page } = this.paginate(options)

    let query = this.ctx.supabase
      .from('workflow_compensations')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (options.runId) query = query.eq('run_id', options.runId)
    if (options.status) query = query.eq('status', options.status)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)

    return toPaginatedResult(
      (data ?? []).map(this.mapRow),
      { limit, page },
      count ?? undefined
    )
  }

  async listPending(limit = 50) {
    const { data, error } = await this.ctx.supabase
      .from('workflow_compensations')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(limit)

    this.throwIfError(error)
    return (data ?? []).map(this.mapRow)
  }

  async markProcessing(id: string): Promise<boolean> {
    const { data, error } = await this.ctx.supabase
      .from('workflow_compensations')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['pending', 'failed'])
      .select('id')
      .maybeSingle()

    this.throwIfError(error)
    return !!data
  }

  async markCompleted(id: string) {
    const { error } = await this.ctx.supabase
      .from('workflow_compensations')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
    this.throwIfError(error)
  }

  async markFailed(id: string, errorMessage: string) {
    const { data: row } = await this.ctx.supabase
      .from('workflow_compensations')
      .select('retry_count, max_retries')
      .eq('id', id)
      .maybeSingle()

    const retryCount = (row?.retry_count ?? 0) + 1
    const maxRetries = row?.max_retries ?? 3
    const status = retryCount >= maxRetries ? 'failed' : 'pending'

    const { error } = await this.ctx.supabase
      .from('workflow_compensations')
      .update({
        status,
        retry_count: retryCount,
        last_error: errorMessage,
        scheduled_at:
          status === 'pending'
            ? new Date(Date.now() + Math.pow(2, retryCount) * 30_000).toISOString()
            : undefined,
      })
      .eq('id', id)

    this.throwIfError(error)
  }

  async retry(ids: string[]) {
    const { error } = await this.ctx.supabase
      .from('workflow_compensations')
      .update({
        status: 'pending',
        retry_count: 0,
        last_error: null,
        scheduled_at: new Date().toISOString(),
      })
      .in('id', ids)
      .in('status', ['failed'])

    this.throwIfError(error)
  }

  private mapRow(row: Record<string, unknown>): WorkflowCompensationRecord {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      runId: row.run_id as string,
      jobId: (row.job_id as string | null) ?? null,
      stepId: row.step_id as string,
      actionType: row.action_type as string,
      config: (row.config as Record<string, unknown>) ?? {},
      status: row.status as WorkflowCompensationRecord['status'],
      retryCount: row.retry_count as number,
      maxRetries: row.max_retries as number,
      lastError: (row.last_error as string | null) ?? null,
      scheduledAt: row.scheduled_at as string,
      startedAt: (row.started_at as string | null) ?? null,
      completedAt: (row.completed_at as string | null) ?? null,
      createdAt: row.created_at as string,
    }
  }
}
