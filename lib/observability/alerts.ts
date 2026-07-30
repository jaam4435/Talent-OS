import type { AlertEvaluation, AlertRule, PlatformHealthSnapshot } from '@/lib/observability/types'

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'outbox_pending_high',
    title: 'Event outbox backlog',
    severity: 'warning',
    threshold: 100,
    evaluate: (s) =>
      s.pendingEvents > 100
        ? {
            message: `${s.pendingEvents} domain events pending dispatch`,
            metricValue: s.pendingEvents,
          }
        : null,
  },
  {
    id: 'dead_letter_threshold',
    title: 'Dead letter queue growth',
    severity: 'critical',
    threshold: 10,
    evaluate: (s) =>
      s.deadLetterEvents >= 10
        ? {
            message: `${s.deadLetterEvents} events in dead letter queue`,
            metricValue: s.deadLetterEvents,
          }
        : null,
  },
  {
    id: 'workflow_failures_spike',
    title: 'Workflow failure spike',
    severity: 'warning',
    threshold: 5,
    evaluate: (s) =>
      s.failedWorkflowRuns24h >= 5
        ? {
            message: `${s.failedWorkflowRuns24h} workflow runs failed in 24h`,
            metricValue: s.failedWorkflowRuns24h,
          }
        : null,
  },
  {
    id: 'ai_cost_budget',
    title: 'AI cost budget threshold',
    severity: 'warning',
    threshold: 0.8,
    evaluate: (s) => {
      if (s.aiMonthlyLimit <= 0) return null
      const utilization = s.aiCostMonth / s.aiMonthlyLimit
      return utilization >= 0.8
        ? {
            message: `AI spend at ${Math.round(utilization * 100)}% of monthly limit`,
            metricValue: utilization,
            metadata: { cost: s.aiCostMonth, limit: s.aiMonthlyLimit },
          }
        : null
    },
  },
  {
    id: 'queue_stale',
    title: 'Stale queue items',
    severity: 'critical',
    threshold: 30,
    evaluate: (s) =>
      s.oldestPendingEventMinutes !== null && s.oldestPendingEventMinutes >= 30
        ? {
            message: `Oldest pending event is ${s.oldestPendingEventMinutes} minutes old`,
            metricValue: s.oldestPendingEventMinutes,
          }
        : null,
  },
  {
    id: 'ai_failures_spike',
    title: 'AI request failures',
    severity: 'warning',
    threshold: 10,
    evaluate: (s) =>
      s.failedAiRequests24h >= 10
        ? {
            message: `${s.failedAiRequests24h} AI requests failed in 24h`,
            metricValue: s.failedAiRequests24h,
          }
        : null,
  },
]

export function evaluateAlertRules(
  snapshot: PlatformHealthSnapshot,
  rules: AlertRule[] = DEFAULT_ALERT_RULES
): Array<{ rule: AlertRule; evaluation: AlertEvaluation }> {
  const fired: Array<{ rule: AlertRule; evaluation: AlertEvaluation }> = []

  for (const rule of rules) {
    const evaluation = rule.evaluate(snapshot)
    if (evaluation) fired.push({ rule, evaluation })
  }

  return fired
}
