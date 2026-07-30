export class AiGuardrailError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly field?: 'input' | 'output'
  ) {
    super(message)
    this.name = 'AiGuardrailError'
  }
}

export function isAiGuardrailError(error: unknown): error is AiGuardrailError {
  return error instanceof AiGuardrailError
}
