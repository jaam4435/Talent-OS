import { randomUUID } from 'crypto'
import type { ObservabilityContext } from '@/lib/observability/types'

let activeContext: ObservabilityContext = {}

export function getObservabilityContext(): ObservabilityContext {
  return activeContext
}

export function runWithObservabilityContext<T>(
  context: ObservabilityContext,
  fn: () => T
): T {
  const previous = activeContext
  activeContext = { ...previous, ...context }
  try {
    return fn()
  } finally {
    activeContext = previous
  }
}

export function mergeObservabilityContext(patch: ObservabilityContext): ObservabilityContext {
  activeContext = { ...activeContext, ...patch }
  return activeContext
}

export function createTraceIds(): { traceId: string; spanId: string } {
  return { traceId: randomUUID(), spanId: randomUUID().slice(0, 16) }
}

export function childSpanId(): string {
  return randomUUID().slice(0, 16)
}
