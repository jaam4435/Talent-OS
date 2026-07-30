import { BaseRepository } from '@/lib/repositories/base/base.repository'
import type {
  AlertSeverity,
  AlertStatus,
  LogEntry,
  MetricPoint,
  ObservabilityContext,
  PlatformLogRow,
  PlatformTraceSpanRow,
  TraceSpanInput,
  AiCostSummary,
  WorkflowMetricsSummary,
  QueueMetricsSummary,
  NotificationMetricsSummary,
  LatencySummary,
  FailureSummary,
  AlertSummary,
  PlatformHealthSnapshot,
} from '@/lib/observability/types'
import type { Json } from '@/modules/core/types/database'

export class ObservabilityRepository extends BaseRepository {
  async insertLog(entry: LogEntry & { context?: ObservabilityContext }): Promise<void> {
    const { error } = await this.ctx.supabase.from('platform_log_entries').insert({
      tenant_id: entry.context?.tenantId ?? null,
      level: entry.level,
      message: entry.message,
      category: entry.category,
      correlation_id: entry.context?.correlationId ?? null,
      request_id: entry.context?.requestId ?? null,
      trace_id: entry.context?.traceId ?? null,
      span_id: entry.context?.spanId ?? null,
      metadata: (entry.metadata ?? {}) as Json,
      error_code: entry.errorCode ?? null,
      duration_ms: entry.durationMs ?? null,
    })
    this.throwIfError(error)
  }

  async insertMetric(point: MetricPoint): Promise<void> {
    const { error } = await this.ctx.supabase.from('platform_metric_points').insert({
      tenant_id: point.tenantId ?? null,
      name: point.name,
      metric_type: point.metricType ?? 'gauge',
      value: point.value,
      unit: point.unit ?? null,
      tags: (point.tags ?? {}) as Json,
      recorded_at: point.recordedAt ?? new Date().toISOString(),
    })
    this.throwIfError(error)
  }

  async insertSpan(span: TraceSpanInput): Promise<void> {
    const { error } = await this.ctx.supabase.from('platform_trace_spans').insert({
      tenant_id: span.context?.tenantId ?? null,
      trace_id: span.traceId,
      span_id: span.spanId,
      parent_span_id: span.parentSpanId ?? null,
      operation: span.operation,
      service: span.service ?? 'talent-os',
      status: span.status ?? 'ok',
      correlation_id: span.context?.correlationId ?? null,
      request_id: span.context?.requestId ?? null,
      metadata: (span.metadata ?? {}) as Json,
      started_at: span.startedAt ?? new Date().toISOString(),
      ended_at: span.endedAt ?? null,
      duration_ms: span.durationMs ?? null,
    })
    this.throwIfError(error)
  }

  async listLogs(params: {
    tenantId?: string
    level?: string
    category?: string
    limit?: number
  }): Promise<PlatformLogRow[]> {
    let query = this.ctx.supabase
      .from('platform_log_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 100)

    if (params.tenantId) query = query.eq('tenant_id', params.tenantId)
    if (params.level) query = query.eq('level', params.level as 'debug' | 'info' | 'warn' | 'error')
    if (params.category) query = query.eq('category', params.category)

    const { data, error } = await query
    this.throwIfError(error)
    return (data ?? []) as PlatformLogRow[]
  }

  async getTraceByCorrelation(correlationId: string): Promise<PlatformTraceSpanRow[]> {
    const { data, error } = await this.ctx.supabase
      .from('platform_trace_spans')
      .select('*')
      .eq('correlation_id', correlationId)
      .order('started_at', { ascending: true })

    this.throwIfError(error)
    return (data ?? []) as PlatformTraceSpanRow[]
  }

  async getTraceById(traceId: string): Promise<PlatformTraceSpanRow[]> {
    const { data, error } = await this.ctx.supabase
      .from('platform_trace_spans')
      .select('*')
      .eq('trace_id', traceId)
      .order('started_at', { ascending: true })

    this.throwIfError(error)
    return (data ?? []) as PlatformTraceSpanRow[]
  }

  async countLogsSince(level: 'warn' | 'error', since: Date, tenantId?: string): Promise<number> {
    let query = this.ctx.supabase
      .from('platform_log_entries')
      .select('id', { count: 'exact', head: true })
      .eq('level', level)
      .gte('created_at', since.toISOString())

    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { count } = await query
    return count ?? 0
  }

  async getApiLatencySummary(tenantId?: string): Promise<{ avgMs: number | null; p95Ms: number | null; count: number }> {
    let query = this.ctx.supabase
      .from('platform_metric_points')
      .select('value')
      .eq('name', 'api.request.duration_ms')
      .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('value', { ascending: true })

    if (tenantId) query = query.eq('tenant_id', tenantId)

    const { data, error } = await query
    this.throwIfError(error)

    const values = (data ?? []).map((r) => Number(r.value)).filter((v) => !Number.isNaN(v))
    if (values.length === 0) return { avgMs: null, p95Ms: null, count: 0 }

    const sum = values.reduce((a, b) => a + b, 0)
    const p95Index = Math.min(values.length - 1, Math.floor(values.length * 0.95))

    return {
      avgMs: Math.round(sum / values.length),
      p95Ms: Math.round(values[p95Index] ?? 0),
      count: values.length,
    }
  }

  async getAiCostSummary(tenantId: string, monthStart: Date): Promise<AiCostSummary> {
    const { data: usageRows } = await this.ctx.supabase
      .from('ai_requests')
      .select('request_type, estimated_cost, duration_ms, status')
      .eq('tenant_id', tenantId)
      .gte('created_at', monthStart.toISOString())

    const rows = usageRows ?? []
    const byTypeMap = new Map<string, { count: number; cost: number; latencySum: number; latencyCount: number }>()

    let monthTotal = 0
    let failedCount24h = 0
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000

    for (const row of rows) {
      const cost = Number(row.estimated_cost ?? 0)
      monthTotal += cost

      const type = row.request_type as string
      const bucket = byTypeMap.get(type) ?? { count: 0, cost: 0, latencySum: 0, latencyCount: 0 }
      bucket.count += 1
      bucket.cost += cost
      if (row.duration_ms) {
        bucket.latencySum += row.duration_ms
        bucket.latencyCount += 1
      }
      byTypeMap.set(type, bucket)
    }

    const { count: failedCount } = await this.ctx.supabase
      .from('ai_requests')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'failed')
      .gte('created_at', new Date(dayAgo).toISOString())

    failedCount24h = failedCount ?? 0

    const byType = [...byTypeMap.entries()].map(([requestType, stats]) => ({
      requestType,
      count: stats.count,
      cost: stats.cost,
      avgLatencyMs: stats.latencyCount > 0 ? Math.round(stats.latencySum / stats.latencyCount) : null,
    }))

    return {
      monthTotal,
      monthLimit: 0,
      utilizationPct: 0,
      byType,
      failedCount24h,
    }
  }

  async getWorkflowMetrics(tenantId: string): Promise<WorkflowMetricsSummary> {
    const { data } = await this.ctx.supabase
      .from('v_observability_workflow_health' as 'workflow_runs')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const row = data as Record<string, unknown> | null

    return {
      running: Number(row?.running_count ?? 0),
      completed7d: Number(row?.completed_count ?? 0),
      failed7d: Number(row?.failed_count ?? 0),
      failed24h: Number(row?.failed_24h ?? 0),
      avgDurationMs: row?.avg_duration_ms ? Math.round(Number(row.avg_duration_ms)) : null,
    }
  }

  async getQueueMetrics(tenantId: string): Promise<QueueMetricsSummary> {
    const { data: queueData } = await this.ctx.supabase
      .from('v_observability_queue_depth' as 'domain_events')
      .select('*')
      .eq('tenant_id', tenantId)

    const { data: pipelineData } = await this.ctx.supabase
      .from('v_event_pipeline_health' as 'domain_events')
      .select('*')
      .eq('tenant_id', tenantId)

    const queues = (queueData ?? []) as Array<Record<string, unknown>>
    const pipeline = (pipelineData ?? []) as Array<Record<string, unknown>>

    const domainEvents = queues
      .filter((r) => r.queue_name === 'domain_events')
      .map((r) => ({
        status: r.status as string,
        count: Number(r.item_count),
        oldestItem: (r.oldest_item as string | null) ?? null,
      }))

    const workflowJobs = queues
      .filter((r) => r.queue_name === 'workflow_jobs')
      .map((r) => ({
        status: r.status as string,
        count: Number(r.item_count),
        oldestItem: (r.oldest_item as string | null) ?? null,
      }))

    const pipelineHealth = pipeline.map((r) => ({
      status: r.status as string,
      count: Number(r.event_count),
    }))

    return { domainEvents, workflowJobs, pipelineHealth }
  }

  async getNotificationMetrics(tenantId: string): Promise<NotificationMetricsSummary> {
    const { data } = await this.ctx.supabase
      .from('v_observability_notification_delivery' as 'notifications')
      .select('*')
      .eq('tenant_id', tenantId)

    return {
      channels: ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
        channel: r.channel as string,
        total: Number(r.total_count),
        delivered: Number(r.delivered_count),
        pending: Number(r.pending_count),
      })),
    }
  }

  async getAiLatencyMetrics(tenantId: string): Promise<LatencySummary['ai']> {
    const { data } = await this.ctx.supabase
      .from('v_observability_ai_latency' as 'ai_requests')
      .select('*')
      .eq('tenant_id', tenantId)

    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      requestType: r.request_type as string,
      avgMs: r.avg_latency_ms ? Math.round(Number(r.avg_latency_ms)) : null,
      p95Ms: r.p95_latency_ms ? Math.round(Number(r.p95_latency_ms)) : null,
      count: Number(r.request_count),
    }))
  }

  async getFailures24h(tenantId: string): Promise<FailureSummary[]> {
    const { data } = await this.ctx.supabase
      .from('v_observability_failures_24h' as 'domain_events')
      .select('*')
      .eq('tenant_id', tenantId)

    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      source: r.source as string,
      status: r.status as string,
      count: Number(r.failure_count),
      sampleError: (r.sample_error as string | null) ?? null,
    }))
  }

  async buildHealthSnapshot(tenantId: string): Promise<PlatformHealthSnapshot> {
    const queues = await this.getQueueMetrics(tenantId)
    const workflow = await this.getWorkflowMetrics(tenantId)

    const pendingEvents =
      queues.domainEvents.find((q) => q.status === 'pending')?.count ?? 0
    const deadLetterEvents =
      queues.domainEvents.find((q) => q.status === 'dead_letter')?.count ?? 0
    const pendingWorkflowJobs =
      queues.workflowJobs.find((q) => q.status === 'pending')?.count ?? 0

    const oldestPending = queues.domainEvents.find((q) => q.status === 'pending')?.oldestItem
    const oldestPendingEventMinutes = oldestPending
      ? Math.round((Date.now() - new Date(oldestPending).getTime()) / 60_000)
      : null

    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)

    const aiCosts = await this.getAiCostSummary(tenantId, monthStart)
    const apiLatency = await this.getApiLatencySummary(tenantId)
    const openAlerts = await this.listAlerts({ tenantId, status: 'open' })

    return {
      tenantId,
      pendingEvents,
      deadLetterEvents,
      pendingWorkflowJobs,
      failedWorkflowRuns24h: workflow.failed24h,
      failedAiRequests24h: aiCosts.failedCount24h,
      aiCostMonth: aiCosts.monthTotal,
      aiMonthlyLimit: aiCosts.monthLimit,
      oldestPendingEventMinutes,
      apiErrorRate24h: apiLatency.count > 0 ? 0 : 0,
      openAlerts: openAlerts.length,
    }
  }

  async upsertAlert(params: {
    tenantId?: string | null
    ruleId: string
    severity: AlertSeverity
    title: string
    message: string
    metricValue?: number
    thresholdValue?: number
    metadata?: Record<string, unknown>
  }): Promise<string | null> {
    let existingQuery = this.ctx.supabase
      .from('platform_alerts')
      .select('id')
      .eq('rule_id', params.ruleId)
      .eq('status', 'open')

    if (params.tenantId) {
      existingQuery = existingQuery.eq('tenant_id', params.tenantId)
    } else {
      existingQuery = existingQuery.is('tenant_id', null)
    }

    const { data: existingRow } = await existingQuery.maybeSingle()
    if (existingRow?.id) return existingRow.id

    const { data, error } = await this.ctx.supabase
      .from('platform_alerts')
      .insert({
        tenant_id: params.tenantId ?? null,
        rule_id: params.ruleId,
        severity: params.severity,
        title: params.title,
        message: params.message,
        metric_value: params.metricValue ?? null,
        threshold_value: params.thresholdValue ?? null,
        metadata: (params.metadata ?? {}) as Json,
      })
      .select('id')
      .single()

    this.throwIfError(error)
    return data?.id ?? null
  }

  async listAlerts(params: {
    tenantId?: string
    status?: AlertStatus
    limit?: number
  }): Promise<AlertSummary[]> {
    let query = this.ctx.supabase
      .from('platform_alerts')
      .select('*')
      .order('fired_at', { ascending: false })
      .limit(params.limit ?? 50)

    if (params.tenantId) query = query.eq('tenant_id', params.tenantId)
    if (params.status) query = query.eq('status', params.status)

    const { data, error } = await query
    this.throwIfError(error)

    return (data ?? []).map((r) => ({
      id: r.id as string,
      ruleId: r.rule_id as string,
      severity: r.severity as AlertSeverity,
      status: r.status as AlertStatus,
      title: r.title as string,
      message: r.message as string,
      metricValue: r.metric_value !== null ? Number(r.metric_value) : null,
      thresholdValue: r.threshold_value !== null ? Number(r.threshold_value) : null,
      firedAt: r.fired_at as string,
    }))
  }

  async updateAlertStatus(alertId: string, status: AlertStatus): Promise<void> {
    const patch: Record<string, unknown> = { status }
    if (status === 'acknowledged') patch.acknowledged_at = new Date().toISOString()
    if (status === 'resolved') patch.resolved_at = new Date().toISOString()

    const { error } = await this.ctx.supabase
      .from('platform_alerts')
      .update(patch as never)
      .eq('id', alertId)

    this.throwIfError(error)
  }

  async countRecentTraces(tenantId?: string): Promise<number> {
    let query = this.ctx.supabase
      .from('platform_trace_spans')
      .select('trace_id', { count: 'exact', head: true })
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (tenantId) query = query.eq('tenant_id', tenantId)
    const { count } = await query
    return count ?? 0
  }

  async listActiveTenantIds(): Promise<string[]> {
    const { data, error } = await this.ctx.supabase.from('tenants').select('id')
    this.throwIfError(error)
    return (data ?? []).map((r) => r.id as string)
  }
}
