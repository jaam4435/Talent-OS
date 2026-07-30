import { describe, expect, it } from 'vitest'
import {
  appendConversationTurn,
  formatTurnsForPrompt,
  getRecentTurns,
  setPinnedApprovalId,
} from '@/lib/whatsapp/conversation-memory'

describe('conversation-memory', () => {
  it('appends and retrieves turns', () => {
    let ctx: Record<string, unknown> = {}
    ctx = appendConversationTurn(ctx, {
      role: 'user',
      content: 'STATUS',
      at: '2026-01-01T00:00:00Z',
      intent: 'project.status',
    })
    ctx = appendConversationTurn(ctx, {
      role: 'assistant',
      content: 'You have 2 active projects',
      at: '2026-01-01T00:00:01Z',
    })

    const turns = getRecentTurns(ctx)
    expect(turns).toHaveLength(2)
    expect(formatTurnsForPrompt(turns)).toContain('Freelancer: STATUS')
  })

  it('pins and clears approval id', () => {
    let ctx = setPinnedApprovalId({}, 'appr-1')
    expect(ctx.pinned_approval_id).toBe('appr-1')
    ctx = setPinnedApprovalId(ctx, null)
    expect(ctx.pinned_approval_id).toBeUndefined()
  })
})
