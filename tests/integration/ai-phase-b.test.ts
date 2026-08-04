import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('AI Phase B migration', () => {
  it('extends ai_requests schema', () => {
    const sql = read('supabase/migrations/029_ai_requests_extend.sql')
    expect(sql).toContain('product_id')
    expect(sql).toContain('prompt_version')
    expect(sql).toContain('openrouter')
    expect(sql).toContain('mock')
  })
})

describe('AI gateway pipeline files', () => {
  it('includes security middleware modules', () => {
    expect(read('lib/ai/security/guardrails/input.ts')).toContain('assertInputGuardrails')
    expect(read('lib/ai/security/pii/redactor.ts')).toContain('redactPii')
    expect(read('lib/ai/middleware/circuit-breaker.ts')).toContain('assertCircuitClosed')
    expect(read('lib/ai/providers/mock.provider.ts')).toContain('MockProvider')
  })

  it('defaults workflow AI execution to direct mode', () => {
    expect(read('lib/workflows/actions.ts')).toContain("process.env.AI_EXECUTION_MODE !== 'n8n'")
  })

  it('tags agent reasoning with feature metadata', () => {
    expect(read('lib/ai/agent/reasoning.ts')).toContain("feature: 'agent_reasoning'")
  })
})
