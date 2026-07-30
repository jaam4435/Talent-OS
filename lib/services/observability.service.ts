import type { Repositories } from '@/lib/repositories/factory'
import { evaluateAlertRules } from '@/lib/observability/alerts'
import { platformLogger } from '@/lib/observability/logger'
import type {
  AlertStatus,
  ObservabilityDashboard,
  PlatformHealthSnapshot,
} from '@/lib/observability/types'

export class ObservabilityService {
  constructor(private readonly repos: Repositories) {}

  async getDashboard(tenantId: string): Promise<ObservabilityDashboard> {
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [
      aiCosts,
      workflow,
      queues,
      notifications,
      aiLatency,
      failures,
      alerts,
      apiLatency,
      errorLogCount,
      warnLogCount,
      traceCount,
    ] = await Promise.all([
      this.repos.observability.getAiCostSummary(tenantId, monthStart),
      this.repos.observability.getWorkflowMetrics(tenantId),
      this.repos.observability.getQueueMetrics(tenantId),
      this.repos.observability.getNotificationMetrics(tenantId),
      this.repos.observability.getAiLatencyMetrics(tenantId),
      this.repos.observability.getFailures24h(tenantId),
      this.repos.observability.listAlerts({ tenantId, status: 'open', limit: 20 }),
      this.repos.observability.getApiLatencySummary(tenantId),
      this.repos.observability.countLogsSince('error', since24h, tenantId),
      this.repos.observability.countLogsSince('warn', since24h, tenantId),
      this.repos.observability.countRecentTraces(tenantId),
    ])

    aiCosts.monthLimit = (await this.repos.tenant.getAiSettings(tenantId)).maxAiRequestsMonthly
    aiCosts.utilizationPct =
      aiCosts.monthLimit > 0
        ? Math.round((aiCosts.monthTotal / aiCosts.monthLimit) * 100)
        : 0

    return {
      generatedAt: new Date().toISOString(),
      aiCosts,
      workflow,
      queues,
      notifications,
      latency: {
        api: {
          avgMs: apiLatency.avgMs,
          p95Ms: apiLatency.p95Ms,
          sampleCount: apiLatency.count,
        },
        ai: aiLatency,
        workflows: { avgMs: workflow.avgDurationMs },
      },
      failures,
      alerts,
      traces: { recentCount: traceCount },
      logs: { errorCount24h: errorLogCount, warnCount24h: warnLogCount },
    }
  }

  async getHealthSnapshot(tenantId: string): Promise<PlatformHealthSnapshot> {
    const snapshot = await this.repos.observability.buildHealthSnapshot(tenantId)
    snapshot.aiMonthlyLimit = (await this.repos.tenant.getAiSettings(tenantId)).maxAiRequestsMonthly
    return snapshot
  }

  async evaluateAlerts(tenantId?: string): Promise<{ fired: number; alerts: string[] }> {
    const tenantIds = tenantId
      ? [tenantId]
      : await this.listActiveTenantIds()

    const alertIds: string[] = []
    let fired = 0

    for (const id of tenantIds) {
      const snapshot = await this.getHealthSnapshot(id)
      const evaluations = evaluateAlertRules(snapshot)

      for (const { rule, evaluation } of evaluations) {
        const alertId = await this.repos.observability.upsertAlert({
          tenantId: id,
          ruleId: rule.id,
          severity: rule.severity,
          title: rule.title,
          message: evaluation.message,
          metricValue: evaluation.metricValue,
          thresholdValue: rule.threshold,
          metadata: evaluation.metadata,
        })

        if (alertId) {
          fired += 1
          alertIds.push(alertId)
          platformLogger.warn(`Alert fired: ${rule.title}`, 'alerts', {
            ruleId: rule.id,
            tenantId: id,
            ...evaluation.metadata,
          }, { tenantId: id })
        }
      }
    }

    return { fired, alerts: alertIds }
  }

  async listAlerts(tenantId: string, status?: AlertStatus) {
    return this.repos.observability.listAlerts({ tenantId, status })
  }

  async acknowledgeAlert(alertId: string) {
    await this.repos.observability.updateAlertStatus(alertId, 'acknowledged')
  }

  async resolveAlert(alertId: string) {
    await this.repos.observability.updateAlertStatus(alertId, 'resolved')
  }

  async getTrace(correlationId: string) {
    return this.repos.observability.getTraceByCorrelation(correlationId)
  }

  async getTraceById(traceId: string) {
    return this.repos.observability.getTraceById(traceId)
  }

  async listLogs(tenantId: string, options?: { level?: string; category?: string; limit?: number }) {
    return this.repos.observability.listLogs({ tenantId, ...options })
  }

  private async listActiveTenantIds(): Promise<string[]> {
    return this.repos.observability.listActiveTenantIds()
  }
}
