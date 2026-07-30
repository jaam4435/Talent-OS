import type { WorkflowCondition, WorkflowTriggerContext } from '@/lib/workflows/types'

function getFieldValue(context: WorkflowTriggerContext, field: string): unknown {
  const parts = field.split('.')
  let current: unknown = {
    payload: context.payload,
    tenantId: context.tenantId,
    eventType: context.eventType,
    aggregateType: context.aggregateType,
    aggregateId: context.aggregateId,
    actorId: context.actorId,
  }

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }
  return String(left ?? '').localeCompare(String(right ?? ''))
}

export function evaluateCondition(
  condition: WorkflowCondition,
  context: WorkflowTriggerContext
): boolean {
  const value = getFieldValue(context, condition.field)

  switch (condition.operator) {
    case 'exists':
      return value !== undefined && value !== null
    case 'eq':
      return value === condition.value
    case 'neq':
      return value !== condition.value
    case 'gt':
      return compareValues(value, condition.value) > 0
    case 'gte':
      return compareValues(value, condition.value) >= 0
    case 'lt':
      return compareValues(value, condition.value) < 0
    case 'lte':
      return compareValues(value, condition.value) <= 0
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value)
    default:
      return false
  }
}

export function evaluateConditions(
  conditions: WorkflowCondition[] | undefined,
  context: WorkflowTriggerContext
): boolean {
  if (!conditions?.length) return true
  return conditions.every((c) => evaluateCondition(c, context))
}
