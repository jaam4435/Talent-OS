import type { ObservabilityContext } from '@/lib/observability/types'
import { mergeObservabilityContext } from '@/lib/observability/context'
import { platformLogger } from '@/lib/observability/logger'
import {
  incrementCounter,
  MetricNames,
  recordHistogram,
} from '@/lib/observability/metrics'
import { startRootTrace, withTrace } from '@/lib/observability/tracing'

export function instrumentApiRequest(input: {
  method: string
  path: string
  status: number
  durationMs: number
  context: ObservabilityContext
  errorCode?: string
}): void {
  mergeObservabilityContext(input.context)

  const tags = {
    method: input.method,
    path: input.path,
    status: input.status,
    errorCode: input.errorCode,
  }

  recordHistogram(
    MetricNames.API_REQUEST_DURATION,
    input.durationMs,
    'ms',
    tags,
    input.context.tenantId
  )
  incrementCounter(MetricNames.API_REQUEST_TOTAL, 1, tags, input.context.tenantId)

  if (input.status >= 400) {
    incrementCounter(MetricNames.API_REQUEST_ERRORS, 1, tags, input.context.tenantId)
    platformLogger.warn('API request failed', 'api', { ...tags, errorCode: input.errorCode }, input.context)
  } else {
    platformLogger.info('API request completed', 'api', tags, input.context)
  }
}

export function instrumentAiRequest(input: {
  feature?: string
  durationMs: number
  cost: number
  status: 'completed' | 'failed'
  context: ObservabilityContext
  errorMessage?: string
}): void {
  const tags = { feature: input.feature, status: input.status }

  recordHistogram(
    MetricNames.AI_REQUEST_DURATION,
    input.durationMs,
    'ms',
    tags,
    input.context.tenantId
  )
  recordHistogram(MetricNames.AI_REQUEST_COST, input.cost, 'usd', tags, input.context.tenantId)

  if (input.status === 'failed') {
    incrementCounter(MetricNames.AI_REQUEST_ERRORS, 1, tags, input.context.tenantId)
    platformLogger.error(
      input.errorMessage ?? 'AI request failed',
      'ai',
      tags,
      input.context
    )
  }
}

export function instrumentWorkflowRun(input: {
  workflowId: string
  durationMs: number
  status: 'completed' | 'failed'
  context: ObservabilityContext
  error?: string
}): void {
  const tags = { workflowId: input.workflowId, status: input.status }

  recordHistogram(
    MetricNames.WORKFLOW_RUN_DURATION,
    input.durationMs,
    'ms',
    tags,
    input.context.tenantId
  )

  if (input.status === 'failed') {
    incrementCounter(MetricNames.WORKFLOW_RUN_FAILURES, 1, tags, input.context.tenantId)
    platformLogger.error(input.error ?? 'Workflow run failed', 'workflow', tags, input.context)
  }
}

export function instrumentQueueProcessing(input: {
  queue: string
  processed: number
  failed: number
  durationMs: number
}): void {
  const trace = startRootTrace('cron.queue.process', undefined, input)
  recordHistogram(MetricNames.CRON_RUN_DURATION, input.durationMs, 'ms', { queue: input.queue })
  incrementCounter(MetricNames.QUEUE_PROCESSED, input.processed, { queue: input.queue })
  if (input.failed > 0) {
    platformLogger.warn('Queue processing had failures', 'queue', input)
  }
  trace.end('ok')
}

export function instrumentNotification(input: {
  channel: string
  status: 'sent' | 'failed'
  context: ObservabilityContext
}): void {
  if (input.status === 'failed') {
    incrementCounter(
      MetricNames.NOTIFICATION_FAILED,
      1,
      { channel: input.channel },
      input.context.tenantId
    )
  } else {
    incrementCounter(
      MetricNames.NOTIFICATION_SENT,
      1,
      { channel: input.channel },
      input.context.tenantId
    )
  }
}

export { withTrace, startRootTrace }
