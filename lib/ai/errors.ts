export class AiGatewayError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AiGatewayError'
  }
}

export class AiProviderError extends AiGatewayError {
  constructor(provider: string, message: string, statusCode = 502, cause?: unknown) {
    super(`[${provider}] ${message}`, 'AI_PROVIDER_ERROR', statusCode, cause)
    this.name = 'AiProviderError'
  }
}

export class AiRateLimitError extends AiGatewayError {
  constructor(resetAt: Date) {
    super(`AI rate limit exceeded. Resets at ${resetAt.toISOString()}`, 'AI_RATE_LIMIT', 429)
    this.name = 'AiRateLimitError'
  }
}

export class AiFeatureDisabledError extends AiGatewayError {
  constructor(feature: string) {
    super(`AI feature disabled: ${feature}`, 'AI_FEATURE_DISABLED', 403)
    this.name = 'AiFeatureDisabledError'
  }
}

export class AiConfigurationError extends AiGatewayError {
  constructor(message: string) {
    super(message, 'AI_NOT_CONFIGURED', 503)
    this.name = 'AiConfigurationError'
  }
}

export class AiStructuredParseError extends AiGatewayError {
  constructor(message: string, cause?: unknown) {
    super(message, 'AI_STRUCTURED_PARSE_ERROR', 502, cause)
    this.name = 'AiStructuredParseError'
  }
}

export class AiGuardrailError extends AiGatewayError {
  constructor(message: string) {
    super(message, 'AI_GUARDRAIL_BLOCKED', 400)
    this.name = 'AiGuardrailError'
  }
}

export class AiCircuitOpenError extends AiGatewayError {
  constructor(provider: string) {
    super(`AI circuit breaker open for provider: ${provider}`, 'AI_CIRCUIT_OPEN', 503)
    this.name = 'AiCircuitOpenError'
  }
}

export function isAiGatewayError(error: unknown): error is AiGatewayError {
  return error instanceof AiGatewayError
}

export function isRetryableAiError(error: unknown): boolean {
  if (!(error instanceof AiGatewayError)) return true
  if (error instanceof AiRateLimitError) return true
  if (error instanceof AiFeatureDisabledError) return false
  if (error instanceof AiConfigurationError) return false
  if (error instanceof AiGuardrailError) return false
  if (error instanceof AiCircuitOpenError) return false
  if (error.statusCode >= 500) return true
  if (error.statusCode === 429) return true
  return false
}
