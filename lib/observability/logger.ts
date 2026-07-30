import type { LogEntry, ObservabilityContext } from '@/lib/observability/types'
import { getObservabilityContext } from '@/lib/observability/context'
import { getObservabilityCollector } from '@/lib/observability/collector'

function mergeContext(context?: ObservabilityContext): ObservabilityContext {
  return { ...getObservabilityContext(), ...context }
}

function emitToConsole(entry: LogEntry & { context: ObservabilityContext }) {
  const payload = {
    level: entry.level,
    message: entry.message,
    category: entry.category,
    correlationId: entry.context.correlationId,
    requestId: entry.context.requestId,
    traceId: entry.context.traceId,
    tenantId: entry.context.tenantId,
    ...entry.metadata,
  }

  const line = JSON.stringify(payload)

  switch (entry.level) {
    case 'error':
      console.error(line)
      break
    case 'warn':
      console.warn(line)
      break
    case 'debug':
      console.debug(line)
      break
    default:
      console.info(line)
  }
}

function log(entry: LogEntry) {
  const context = mergeContext(entry.context)
  emitToConsole({ ...entry, context })
  void getObservabilityCollector().recordLog({ ...entry, context })
}

export const platformLogger = {
  debug(message: string, category: string, metadata?: Record<string, unknown>, context?: ObservabilityContext) {
    log({ level: 'debug', message, category, metadata, context })
  },
  info(message: string, category: string, metadata?: Record<string, unknown>, context?: ObservabilityContext) {
    log({ level: 'info', message, category, metadata, context })
  },
  warn(message: string, category: string, metadata?: Record<string, unknown>, context?: ObservabilityContext) {
    log({ level: 'warn', message, category, metadata, context })
  },
  error(
    message: string,
    category: string,
    metadata?: Record<string, unknown>,
    context?: ObservabilityContext,
    errorCode?: string
  ) {
    log({ level: 'error', message, category, metadata, context, errorCode })
  },
}
