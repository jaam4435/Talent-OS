import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'
import { toPaginatedResult, type PaginatedResult } from '@/lib/repositories/base/types'
import type { WorkflowExecutionHistoryEntry } from '@/modules/workflow-engine/types'

export class WorkflowExecutionHistoryRepository extends BaseRepository {
  async record(input: {
    tenant_id: string
    run_id: string
    job_id?: string | null
    step_id: string
    action_type: string
    status: WorkflowExecutionHistoryEntry['status']
    input?: Record<string, unknown>
    output?: Record<string, unknown>
    error?: string | null
    duration_ms?: number | null
  }): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('workflow_execution_history')
      .insert({
        tenant_id: input.tenant_id,
        run_id: input.run_id,
        job_id: input.job_id ?? null,
        step_id: input.step_id,
        action_type: input.action_type,
        status: input.status,
        input: (input.input ?? {}) as Json,
        output: (input.output ?? {}) as Json,
        error: input.error ?? null,
        duration_ms: input.duration_ms ?? null,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Workflow execution history')
    return data.id
  }

  async list(
    tenantId: string,
    options: {
      page?: number
      limit?: number
      runId?: string
      status?: WorkflowExecutionHistoryEntry['status']
    }
  ): Promise<PaginatedResult<WorkflowExecutionHistoryEntry>> {
    const { limit, offset, page } = this.paginate(options)

    let query = this.ctx.supabase
      .from('workflow_execution_history')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (options.runId) query = query.eq('run_id', options.runId)
    if (options.status) query = query.eq('status', options.status)

    const { data, error, count } = await query.range(offset, offset + limit - 1)
    this.throwIfError(error)

    return toPaginatedResult(
      (data ?? []).map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        runId: row.run_id,
        jobId: row.job_id,
        stepId: row.step_id,
        actionType: row.action_type,
        status: row.status as WorkflowExecutionHistoryEntry['status'],
        input: (row.input as Record<string, unknown>) ?? {},
        output: (row.output as Record<string, unknown>) ?? {},
        error: row.error,
        durationMs: row.duration_ms,
        createdAt: row.created_at,
      })),
      { limit, page },
      count ?? undefined
    )
  }
}
