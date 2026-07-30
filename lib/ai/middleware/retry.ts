import { isRetryableAiError } from '@/lib/ai/errors'

export interface RetryOptions {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs?: number
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
  const maxDelay = options.maxDelayMs ?? 30_000
  let lastError: unknown

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= options.maxRetries || !isRetryableAiError(error)) {
        throw error
      }

      onRetry?.(attempt + 1, error)
      const delay = Math.min(options.baseDelayMs * 2 ** attempt, maxDelay)
      await sleep(delay)
    }
  }

  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
