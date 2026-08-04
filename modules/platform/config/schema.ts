import { z } from 'zod'

export const platformConfigValueSchema = z.record(z.string(), z.unknown())

export const aiConfigSchema = z.object({
  defaultProvider: z.string().default('openai'),
  maxConcurrentRequests: z.number().int().positive().default(10),
})

export type AiConfig = z.infer<typeof aiConfigSchema>

export function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }

  for (const [key, value] of Object.entries(override)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      )
    } else {
      result[key] = value
    }
  }

  return result
}
