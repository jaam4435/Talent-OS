/** Legacy quick-response parser — prefer detectIntent from ./intents */

const QUICK_RESPONSES: Record<string, 'interested' | 'declined'> = {
  YES: 'interested',
  Y: 'interested',
  INTERESTED: 'interested',
  NO: 'declined',
  N: 'declined',
  DECLINE: 'declined',
  DECLINED: 'declined',
}

export function parseQuickResponse(body: string): 'interested' | 'declined' | null {
  const normalized = body.trim().toUpperCase()
  return QUICK_RESPONSES[normalized] ?? null
}
