import type { ActionResponse } from '@/modules/core/types/api'
import { mapToAppError } from '@/modules/core/api/error-mapper'
import type { ActionResult } from '@/modules/core/utils/result'

/** Map legacy ActionResult to standardized ActionResponse with error codes. */
export function toActionResponse<T extends Record<string, unknown>>(
  result: ActionResult<T>
): ActionResponse<T> {
  if (result.ok) {
    const { ok: _ok, ...data } = result
    return { ok: true, data: data as unknown as T }
  }
  const mapped = mapToAppError(new Error(result.error))
  return { ok: false, error: mapped.message, code: mapped.code }
}

/** Wrap an action handler with standardized error mapping — preserves { ok: true/false } shape. */
export async function runStandardAction<T extends Record<string, unknown>>(
  fn: () => Promise<ActionResult<T>>
): Promise<ActionResponse<T>> {
  try {
    const result = await fn()
    return toActionResponse(result)
  } catch (error) {
    const mapped = mapToAppError(error)
    return { ok: false, error: mapped.message, code: mapped.code }
  }
}

/** Backwards-compatible adapter: returns legacy ActionResult while adding code on failure. */
export function actionResultWithCode<T extends Record<string, unknown>>(
  response: ActionResponse<T>
): ActionResult<T> & { code?: string } {
  if (response.ok) {
    return { ok: true, ...(response.data ?? {}) } as ActionResult<T> & { code?: string }
  }
  return { ok: false, error: response.error ?? 'Unknown error', code: response.code }
}
