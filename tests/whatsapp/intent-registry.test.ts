import { describe, expect, it } from 'vitest'
import { INTENT_REGISTRY, getIntentDefinition } from '@/lib/whatsapp/intent-registry'
import { WHATSAPP_WEB_PARITY } from '@/lib/whatsapp/parity'

describe('intent-registry', () => {
  it('registers all parity intents', () => {
    const registered = new Set(INTENT_REGISTRY.map((d) => d.intent))
    const parityIntents = WHATSAPP_WEB_PARITY.flatMap((p) => p.whatsappIntents)

    for (const intent of parityIntents) {
      expect(registered.has(intent), `missing registry for ${intent}`).toBe(true)
    }
  })

  it('every definition references a service', () => {
    for (const def of INTENT_REGISTRY) {
      expect(def.service.length).toBeGreaterThan(0)
      expect(getIntentDefinition(def.intent)).toBeDefined()
    }
  })
})
