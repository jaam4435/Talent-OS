import type { MetricPoint } from '@/lib/observability/types'
import { getObservabilityCollector } from '@/lib/observability/collector'

export const MetricNames = {
  API_REQUEST_DURATION: 'api.request.duration_ms',
  API_REQUEST_TOTAL: 'api.request.total',
  API_REQUEST_ERRORS: 'api.request.errors',
  AI_REQUEST_DURATION: 'ai.request.duration_ms',
  AI_REQUEST_COST: 'ai.request.cost_usd',
  AI_REQUEST_ERRORS: 'ai.request.errors',
  WORKFLOW_RUN_DURATION: 'workflow.run.duration_ms',
  WORKFLOW_RUN_FAILURES: 'workflow.run.failures',
  QUEUE_DEPTH: 'queue.depth',
  QUEUE_PROCESSED: 'queue.processed',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  CRON_RUN_DURATION: 'cron.run.duration_ms',
} as const

export function recordMetric(point: MetricPoint): void {
  void getObservabilityCollector().recordMetric(point)
}

export function incrementCounter(
  name: string,
  value = 1,
  tags?: Record<string, unknown>,
  tenantId?: string | null
): void {
  recordMetric({ name, value, metricType: 'counter', tags, tenantId })
}

export function recordGauge(
  name: string,
  value: number,
  unit?: string,
  tags?: Record<string, unknown>,
  tenantId?: string | null
): void {
  recordMetric({ name, value, metricType: 'gauge', unit, tags, tenantId })
}

export function recordHistogram(
  name: string,
  value: number,
  unit?: string,
  tags?: Record<string, unknown>,
  tenantId?: string | null
): void {
  recordMetric({ name, value, metricType: 'histogram', unit, tags, tenantId })
}
