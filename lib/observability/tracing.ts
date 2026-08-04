import { randomUUID } from 'crypto'
import type { ObservabilityContext, TraceSpanInput } from '@/lib/observability/types'
import {
  childSpanId,
  createTraceIds,
  getObservabilityContext,
  mergeObservabilityContext,
} from '@/lib/observability/context'
import { getObservabilityCollector } from '@/lib/observability/collector'

export class TraceSpan {
  private readonly startedAt = Date.now()
  private ended = false

  constructor(
    private readonly input: TraceSpanInput,
    private readonly onEnd: (span: TraceSpanInput) => void
  ) {}

  end(status: 'ok' | 'error' = 'ok', metadata?: Record<string, unknown>): void {
    if (this.ended) return
    this.ended = true

    const endedAt = new Date().toISOString()
    const durationMs = Date.now() - this.startedAt

    this.onEnd({
      ...this.input,
      status,
      metadata: { ...this.input.metadata, ...metadata },
      startedAt: new Date(this.startedAt).toISOString(),
      endedAt,
      durationMs,
    })
  }
}

export function startTrace(
  operation: string,
  context?: ObservabilityContext,
  metadata?: Record<string, unknown>
): TraceSpan {
  const active = getObservabilityContext()
  const traceId = context?.traceId ?? active.traceId ?? randomUUID()
  const spanId = context?.spanId ?? active.spanId ?? childSpanId()

  mergeObservabilityContext({ ...context, traceId, spanId })

  const input: TraceSpanInput = {
    traceId,
    spanId,
    parentSpanId: active.spanId && active.spanId !== spanId ? active.spanId : context?.spanId,
    operation,
    context: { ...active, ...context, traceId, spanId },
    metadata,
    status: 'ok',
  }

  return new TraceSpan(input, (completed) => {
    void getObservabilityCollector().recordSpan(completed)
  })
}

export function startRootTrace(
  operation: string,
  context?: ObservabilityContext,
  metadata?: Record<string, unknown>
): TraceSpan {
  const ids = createTraceIds()
  return startTrace(operation, { ...context, ...ids }, metadata)
}

export async function withTrace<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: ObservabilityContext,
  metadata?: Record<string, unknown>
): Promise<T> {
  const span = startTrace(operation, context, metadata)
  try {
    const result = await fn()
    span.end('ok')
    return result
  } catch (error) {
    span.end('error', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
