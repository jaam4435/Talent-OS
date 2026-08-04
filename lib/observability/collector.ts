import type { LogEntry, MetricPoint, TraceSpanInput } from '@/lib/observability/types'

type PendingWrite =
  | { type: 'log'; entry: LogEntry & { context: LogEntry['context'] } }
  | { type: 'metric'; point: MetricPoint }
  | { type: 'span'; span: TraceSpanInput }

/** Buffers observability writes and flushes asynchronously to avoid blocking hot paths. */
class ObservabilityCollector {
  private buffer: PendingWrite[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private readonly maxBuffer = 100

  recordLog(entry: LogEntry & { context: LogEntry['context'] }): void {
    this.enqueue({ type: 'log', entry })
  }

  recordMetric(point: MetricPoint): void {
    this.enqueue({ type: 'metric', point })
  }

  recordSpan(span: TraceSpanInput): void {
    this.enqueue({ type: 'span', span })
  }

  private enqueue(write: PendingWrite): void {
    this.buffer.push(write)
    if (this.buffer.length >= this.maxBuffer) {
      void this.flush()
      return
    }
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => void this.flush(), 250)
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.buffer.length === 0) return

    const batch = this.buffer.splice(0, this.buffer.length)

    try {
      const { createAdminRepositories } = await import('@/lib/repositories/factory')
      const repos = await createAdminRepositories()

      for (const item of batch) {
        if (item.type === 'log') {
          await repos.observability.insertLog(item.entry)
        } else if (item.type === 'metric') {
          await repos.observability.insertMetric(item.point)
        } else {
          await repos.observability.insertSpan(item.span)
        }
      }
    } catch (error) {
      const { platformLogger } = await import('@/lib/observability/logger')
      platformLogger.error(
        'Observability collector flush failed',
        'observability',
        { batchSize: batch.length },
        undefined,
        error instanceof Error ? error.message : 'flush_failed'
      )
      this.buffer.unshift(...batch)
    }
  }
}

let collector: ObservabilityCollector | null = null

export function getObservabilityCollector(): ObservabilityCollector {
  if (!collector) collector = new ObservabilityCollector()
  return collector
}

export function resetObservabilityCollector(): void {
  collector = null
}
