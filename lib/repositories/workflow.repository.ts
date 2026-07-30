import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type { Json } from '@/modules/core/types/database'

export class WorkflowRepository extends BaseRepository {
  async createRun(input: {
    tenant_id: string
    workflow_id: string
    trigger_event_id: string
    trigger_event_type: string
    context: Record<string, unknown>
    correlation_id: string
  }): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('workflow_runs')
      .insert({
        tenant_id: input.tenant_id,
        workflow_id: input.workflow_id,
        trigger_event_id: input.trigger_event_id,
        trigger_event_type: input.trigger_event_type,
        context: input.context as Json,
        correlation_id: input.correlation_id,
        status: 'pending',
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Workflow run')
    return data.id
  }

  async findRunByTrigger(tenantId: string, eventId: string, workflowId: string) {
    const { data } = await this.ctx.supabase
      .from('workflow_runs')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('trigger_event_id', eventId)
      .eq('workflow_id', workflowId)
      .maybeSingle()
    return data ?? null
  }

  async findRunById(runId: string) {
    const { data } = await this.ctx.supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .maybeSingle()
    return data ?? null
  }

  async updateRunStatus(
    runId: string,
    status: string,
    patch?: { started_at?: string; completed_at?: string; current_step_id?: string; last_error?: string }
  ) {
    const { error } = await this.ctx.supabase
      .from('workflow_runs')
      .update({ status, ...patch })
      .eq('id', runId)
    this.throwIfError(error)
  }

  async createJob(input: {
    tenant_id: string
    run_id: string
    step_id: string
    queue_name: string
    action_type: string
    config: Record<string, unknown>
    max_retries?: number
  }): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('workflow_jobs')
      .insert({
        tenant_id: input.tenant_id,
        run_id: input.run_id,
        step_id: input.step_id,
        queue_name: input.queue_name,
        action_type: input.action_type,
        config: input.config as Json,
        max_retries: input.max_retries ?? 5,
        status: 'pending',
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Workflow job')
    return data.id
  }

  async listPendingJobs(limit = 50, queueName?: string) {
    const { data, error } = await (this.ctx.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: Awaited<ReturnType<WorkflowRepository['listPendingJobsLegacy']>> | null; error: unknown }>)(
      'claim_workflow_jobs',
      { p_limit: limit, p_queue: queueName ?? null }
    )
    if (!error && data !== null && data !== undefined) {
      return data
    }

    return this.listPendingJobsLegacy(limit, queueName)
  }

  async listPendingJobsLegacy(limit = 50, queueName?: string) {
    let query = this.ctx.supabase
      .from('workflow_jobs')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(limit)

    if (queueName) query = query.eq('queue_name', queueName)

    const { data: pending, error: listError } = await query
    this.throwIfError(listError)

    const claimed: NonNullable<typeof pending> = []
    for (const job of pending ?? []) {
      const { data: row, error: claimError } = await this.ctx.supabase
        .from('workflow_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job.id)
        .in('status', ['pending', 'failed'])
        .select('*')
        .maybeSingle()
      this.throwIfError(claimError)
      if (row) claimed.push(row)
    }

    return claimed
  }

  async listDeadLetterJobs(tenantId: string, limit = 50) {
    const { data, error } = await this.ctx.supabase
      .from('workflow_jobs')
      .select('id, action_type, last_error, retry_count, created_at, run_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'dead_letter')
      .order('created_at', { ascending: false })
      .limit(limit)
    this.throwIfError(error)
    return data ?? []
  }

  async markJobProcessing(jobId: string): Promise<boolean> {
    // Jobs are already marked processing by claim_workflow_jobs RPC
    const { data } = await this.ctx.supabase
      .from('workflow_jobs')
      .select('id')
      .eq('id', jobId)
      .eq('status', 'processing')
      .maybeSingle()
    return !!data
  }

  async markJobProcessingLegacy(jobId: string): Promise<boolean> {
    const { data, error } = await this.ctx.supabase
      .from('workflow_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId)
      .in('status', ['pending', 'failed'])
      .select('id')
      .maybeSingle()

    this.throwIfError(error)
    return !!data
  }

  async markJobCompleted(jobId: string) {
    const { error } = await this.ctx.supabase
      .from('workflow_jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', jobId)
    this.throwIfError(error)
  }

  async markJobFailed(jobId: string, errorMessage: string) {
    const { data: job } = await this.ctx.supabase
      .from('workflow_jobs')
      .select('retry_count, max_retries')
      .eq('id', jobId)
      .maybeSingle()

    const retryCount = (job?.retry_count ?? 0) + 1
    const maxRetries = job?.max_retries ?? 5
    const status = retryCount >= maxRetries ? 'dead_letter' : 'failed'

    const { error } = await this.ctx.supabase
      .from('workflow_jobs')
      .update({
        status,
        retry_count: retryCount,
        last_error: errorMessage,
        scheduled_at:
          status === 'failed'
            ? new Date(Date.now() + Math.pow(2, retryCount) * 30_000).toISOString()
            : undefined,
      })
      .eq('id', jobId)

    this.throwIfError(error)
  }

  async countPendingJobsForRun(runId: string): Promise<number> {
    const { count } = await this.ctx.supabase
      .from('workflow_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('run_id', runId)
      .in('status', ['pending', 'processing', 'failed'])
    return count ?? 0
  }

  async createApproval(input: {
    tenant_id: string
    run_id: string
    job_id: string
    approver_id: string | null
    approver_role: string
    title: string
    body: string | null
    entity_type: string
    entity_id: string
    metadata: Record<string, unknown>
    expires_at: string | null
  }): Promise<string> {
    const { data, error } = await this.ctx.supabase
      .from('approval_requests')
      .insert({
        tenant_id: input.tenant_id,
        run_id: input.run_id,
        job_id: input.job_id,
        approver_id: input.approver_id,
        approver_role: input.approver_role,
        title: input.title,
        body: input.body,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        metadata: input.metadata as Json,
        expires_at: input.expires_at,
        status: 'pending',
      })
      .select('id')
      .single()

    this.throwIfError(error)
    if (!data?.id) this.notFound('Approval request')
    return data.id
  }

  async findMemberRole(tenantId: string, userId: string): Promise<string | null> {
    const { data } = await this.ctx.supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    return data?.role ?? null
  }

  async findApprovalById(approvalId: string) {
    const { data } = await this.ctx.supabase
      .from('approval_requests')
      .select('*')
      .eq('id', approvalId)
      .maybeSingle()
    return data ?? null
  }

  async updateApproval(
    approvalId: string,
    patch: {
      status: string
      decided_at: string
      decided_by: string
      decision_note: string | null
    }
  ) {
    const { error } = await this.ctx.supabase
      .from('approval_requests')
      .update(patch)
      .eq('id', approvalId)
    this.throwIfError(error)
  }

  async listPendingApprovals(userId: string, tenantId: string) {
    const { data, error } = await this.ctx.supabase
      .from('approval_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('approver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    this.throwIfError(error)
    return data ?? []
  }

  async retryFailedEvents(eventIds: string[]) {
    const { error } = await this.ctx.supabase
      .from('domain_events')
      .update({
        status: 'pending',
        retry_count: 0,
        last_error: null,
        scheduled_at: new Date().toISOString(),
      })
      .in('id', eventIds)
      .in('status', ['failed', 'dead_letter'])

    this.throwIfError(error)
  }

  async retryFailedJobs(jobIds: string[]) {
    const { error } = await this.ctx.supabase
      .from('workflow_jobs')
      .update({
        status: 'pending',
        retry_count: 0,
        last_error: null,
        scheduled_at: new Date().toISOString(),
      })
      .in('id', jobIds)
      .in('status', ['failed', 'dead_letter'])

    this.throwIfError(error)
  }
}
