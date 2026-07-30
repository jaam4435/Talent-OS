import { DomainError, ErrorCodes, isDomainError } from '@/modules/core/utils/errors'

export type ActionOk<T extends Record<string, unknown> = Record<never, never>> = {
  ok: true
} & T

export type ActionFail = { ok: false; error: string }

export type ActionResult<T extends Record<string, unknown> = Record<never, never>> =
  | ActionOk<T>
  | ActionFail

export function actionOk(): ActionOk
export function actionOk<T extends Record<string, unknown>>(data: T): ActionOk<T>
export function actionOk<T extends Record<string, unknown>>(data?: T): ActionOk<T> {
  return { ok: true, ...(data ?? {}) } as ActionOk<T>
}

export function actionFail(error: string): ActionFail {
  return { ok: false, error }
}

export function domainErrorToActionResult(error: DomainError): ActionFail {
  return actionFail(error.message)
}

export function catchToActionResult(error: unknown): ActionFail {
  if (isDomainError(error)) {
    return domainErrorToActionResult(error)
  }

  if (error instanceof Error) {
    if (error.message === 'FORBIDDEN' || error.message.startsWith('FORBIDDEN:')) {
      return actionFail('FORBIDDEN')
    }
    return actionFail(error.message)
  }

  return actionFail('An unexpected error occurred')
}

export function runAction<T extends Record<string, unknown>>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  return fn()
    .then((data) => actionOk(data))
    .catch((error: unknown) => catchToActionResult(error))
}
