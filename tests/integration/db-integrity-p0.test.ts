import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createAllocationSchema,
  updateAllocationSchema,
  validateAllocationTarget,
} from '@/modules/assignment/validation'

const ROOT = process.cwd()

function read(path: string) {
  return readFileSync(join(ROOT, path), 'utf8')
}

describe('Migration 032 — database integrity P0', () => {
  const sql = read('supabase/migrations/032_db_integrity_p0.sql')

  it('adds assignment allocation XOR constraint', () => {
    expect(sql).toContain('assignment_allocation_target_xor')
    expect(sql).toMatch(/project_id IS NOT NULL AND opportunity_id IS NULL/)
    expect(sql).toMatch(/project_id IS NULL AND opportunity_id IS NOT NULL/)
  })

  it('adds opportunity index on assignment_allocations', () => {
    expect(sql).toContain('idx_assignment_allocations_opportunity')
  })

  it('replaces member_invites email unique with pending partial index', () => {
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS member_invites_tenant_id_email_key')
    expect(sql).toContain('idx_member_invites_pending_email')
    expect(sql).toMatch(/WHERE accepted_at IS NULL AND revoked_at IS NULL/)
  })

  it('links whatsapp messages and memory to conversations', () => {
    expect(sql).toContain('whatsapp_messages')
    expect(sql).toContain('whatsapp_memory_entries')
    expect(sql).toContain('conversation_id UUID REFERENCES whatsapp_conversations(id)')
    expect(sql).toContain('ALTER COLUMN conversation_id SET NOT NULL')
  })
})

describe('Assignment allocation target validation', () => {
  it('accepts project-only target', () => {
    expect(validateAllocationTarget('project-1', null).ok).toBe(true)
    expect(
      createAllocationSchema.safeParse({
        freelancer_id: '00000000-0000-4000-8000-000000000001',
        project_id: '00000000-0000-4000-8000-000000000002',
        title: 'Sprint allocation',
        starts_at: '2026-08-01T09:00:00.000Z',
        ends_at: '2026-08-05T17:00:00.000Z',
      }).success
    ).toBe(true)
  })

  it('accepts opportunity-only target', () => {
    expect(validateAllocationTarget(null, 'opp-1').ok).toBe(true)
  })

  it('rejects missing target', () => {
    const result = validateAllocationTarget(null, null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('project or an opportunity')
    }
  })

  it('rejects dual targets', () => {
    const result = validateAllocationTarget('project-1', 'opp-1')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('both')
    }
  })

  it('allows partial update without target fields', () => {
    expect(
      updateAllocationSchema.safeParse({
        title: 'Renamed allocation',
      }).success
    ).toBe(true)
  })
})

describe('WhatsApp conversation linkage in application layer', () => {
  it('stores conversation_id on inbound message insert', () => {
    const src = read('lib/repositories/integration.repository.ts')
    expect(src).toContain('conversation_id: input.conversation_id')
  })

  it('resolves conversation before inbound WhatsApp insert', () => {
    const src = read('lib/services/whatsapp.service.ts')
    expect(src).toMatch(/getConversation[\s\S]*createInboundWhatsApp/)
  })

  it('requires conversation_id for memory append', () => {
    const src = read('lib/repositories/whatsapp-memory.repository.ts')
    expect(src).toContain('conversation_id: input.conversation_id')
  })
})

describe('Organization invite partial unique handling', () => {
  it('maps duplicate pending invite to friendly error', () => {
    const src = read('lib/repositories/organization-invite.repository.ts')
    expect(src).toContain("error?.code === '23505'")
    expect(src).toContain('An invite already exists for this email.')
  })
})
