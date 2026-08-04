/** Platform observability domain types. */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type MetricType = 'counter' | 'gauge' | 'histogram'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

export interface ObservabilityContext {
  tenantId?: string | null
  correlationId?: string | null
  requestId?: string | null
  traceId?: string | null
  spanId?: string | null
  userId?: string | null
}

export interface LogEntry {
  level: LogLevel
  message: string
  category: string
  context?: ObservabilityContext
  metadata?: Record<string, unknown>
  errorCode?: string
  durationMs?: number
}

export interface MetricPoint {
  name: string
  value: number
  metricType?: MetricType
  unit?: string
  tags?: Record<string, unknown>
  tenantId?: string | null
  recordedAt?: string
}

export interface TraceSpanInput {
  traceId: string
  spanId: string
  parentSpanId?: string | null
  operation: string
  service?: string
  status?: 'ok' | 'error'
  context?: ObservabilityContext
  metadata?: Record<string, unknown>
  durationMs?: number
  startedAt?: string
  endedAt?: string
}

export interface AlertRule {
  id: string
  title: string
  severity: AlertSeverity
  threshold: number
  evaluate: (snapshot: PlatformHealthSnapshot) => AlertEvaluation | null
}

export interface AlertEvaluation {
  message: string
  metricValue: number
  metadata?: Record<string, unknown>
}

export interface PlatformHealthSnapshot {
  tenantId?: string
  pendingEvents: number
  deadLetterEvents: number
  pendingWorkflowJobs: number
  failedWorkflowRuns24h: number
  failedAiRequests24h: number
  aiCostMonth: number
  aiMonthlyLimit: number
  oldestPendingEventMinutes: number | null
  apiErrorRate24h: number
  openAlerts: number
}

export interface ObservabilityDashboard {
  generatedAt: string
  aiCosts: AiCostSummary
  workflow: WorkflowMetricsSummary
  queues: QueueMetricsSummary
  notifications: NotificationMetricsSummary
  latency: LatencySummary
  failures: FailureSummary[]
  alerts: AlertSummary[]
  traces: { recentCount: number }
  logs: { errorCount24h: number; warnCount24h: number }
}

export interface AiCostSummary {
  monthTotal: number
  monthLimit: number
  utilizationPct: number
  byType: Array<{ requestType: string; count: number; cost: number; avgLatencyMs: number | null }>
  failedCount24h: number
}

export interface WorkflowMetricsSummary {
  running: number
  completed7d: number
  failed7d: number
  failed24h: number
  avgDurationMs: number | null
}

export interface QueueMetricsSummary {
  domainEvents: Array<{ status: string; count: number; oldestItem: string | null }>
  workflowJobs: Array<{ status: string; count: number; oldestItem: string | null }>
  pipelineHealth: Array<{ status: string; count: number }>
}

export interface NotificationMetricsSummary {
  channels: Array<{ channel: string; total: number; delivered: number; pending: number }>
}

export interface LatencySummary {
  api: { avgMs: number | null; p95Ms: number | null; sampleCount: number }
  ai: Array<{ requestType: string; avgMs: number | null; p95Ms: number | null; count: number }>
  workflows: { avgMs: number | null }
}

export interface FailureSummary {
  source: string
  status: string
  count: number
  sampleError: string | null
}

export interface AlertSummary {
  id: string
  ruleId: string
  severity: AlertSeverity
  status: AlertStatus
  title: string
  message: string
  metricValue: number | null
  thresholdValue: number | null
  firedAt: string
}

export interface PlatformLogRow {
  id: string
  tenant_id: string | null
  level: LogLevel
  message: string
  category: string
  correlation_id: string | null
  request_id: string | null
  trace_id: string | null
  span_id: string | null
  metadata: Record<string, unknown>
  error_code: string | null
  duration_ms: number | null
  created_at: string
}

export interface PlatformTraceSpanRow {
  id: string
  tenant_id: string | null
  trace_id: string
  span_id: string
  parent_span_id: string | null
  operation: string
  service: string
  status: string
  correlation_id: string | null
  request_id: string | null
  metadata: Record<string, unknown>
  started_at: string
  ended_at: string | null
  duration_ms: number | null
}
