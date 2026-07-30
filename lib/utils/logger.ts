type LogLevel = 'info' | 'warn' | 'error'

export function logEvent(
  scope: string,
  message: string,
  meta?: Record<string, unknown>,
  level: LogLevel = 'info'
): void {
  const entry = {
    scope,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  }

  const serialized = JSON.stringify(entry)
  if (level === 'error') {
    console.error(serialized)
    return
  }
  if (level === 'warn') {
    console.warn(serialized)
    return
  }
  console.log(serialized)
}
