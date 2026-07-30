import type { ProviderId } from '@/lib/ai/types'

/** USD per 1M tokens — approximate list prices for cost estimation. */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
}

const PROVIDER_DEFAULTS: Record<ProviderId, { input: number; output: number }> = {
  openai: { input: 2.5, output: 10 },
  anthropic: { input: 3, output: 15 },
  gemini: { input: 0.075, output: 0.3 },
  openrouter: { input: 2.5, output: 10 },
}

export function estimateTokenCost(
  provider: ProviderId,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? PROVIDER_DEFAULTS[provider]
  return (
    (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
  )
}

export interface CostRecord {
  provider: ProviderId
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  feature?: string
  tenantId?: string
  timestamp: Date
}

export class CostTracker {
  private readonly records: CostRecord[] = []

  record(entry: Omit<CostRecord, 'timestamp' | 'estimatedCost'> & { estimatedCost?: number }) {
    const estimatedCost =
      entry.estimatedCost ??
      estimateTokenCost(entry.provider, entry.model, entry.inputTokens, entry.outputTokens)

    this.records.push({
      ...entry,
      estimatedCost,
      timestamp: new Date(),
    })

    return estimatedCost
  }

  getTenantTotal(tenantId: string, since?: Date): number {
    return this.records
      .filter((r) => r.tenantId === tenantId && (!since || r.timestamp >= since))
      .reduce((sum, r) => sum + r.estimatedCost, 0)
  }

  getRecent(limit = 100): CostRecord[] {
    return this.records.slice(-limit)
  }
}

export const globalCostTracker = new CostTracker()
