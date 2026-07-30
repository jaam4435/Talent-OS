import { describe, expect, it, vi } from 'vitest'
import { DomainEventRepository } from '@/lib/repositories/domain-event.repository'
import { createMockSupabase } from '@/tests/helpers/mock-supabase'

describe('DomainEventRepository.claimForDispatch', () => {
  it('claims only events that pass conditional update', async () => {
    const event = {
      id: 'evt-1',
      status: 'pending',
      tenant_id: 't-1',
      event_type: 'test.event',
    }

    const supabase = createMockSupabase({
      domain_events: { data: [event], error: null },
    })

    supabase.rpc = vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST202' } })

    const repo = new DomainEventRepository({ supabase: supabase as never })
    vi.spyOn(repo, 'listPendingForDispatch').mockResolvedValue([event] as never)

    supabase.from = vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: event, error: null }),
    }))

    const claimed = await repo.claimForDispatch(10)
    expect(claimed).toHaveLength(1)
    expect(claimed[0].id).toBe('evt-1')
  })
})
