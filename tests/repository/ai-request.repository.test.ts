import { describe, expect, it, vi } from 'vitest'
import { AiRequestRepository } from '@/lib/repositories/ai-request.repository'
import { createMockSupabase } from '@/tests/helpers/mock-supabase'

const AI_REQUEST_ID = '11111111-1111-1111-1111-111111111111'

describe('AiRequestRepository.claim', () => {
  it('returns already_completed without update', async () => {
    const supabase = createMockSupabase({})
    const repo = new AiRequestRepository({ supabase: supabase as never })
    vi.spyOn(repo, 'findById').mockResolvedValue({
      id: AI_REQUEST_ID,
      status: 'completed',
    } as never)

    const result = await repo.claim(AI_REQUEST_ID)
    expect(result).toBe('already_completed')
  })

  it('returns already_processing for in-flight requests', async () => {
    const supabase = createMockSupabase({})
    const repo = new AiRequestRepository({ supabase: supabase as never })
    vi.spyOn(repo, 'findById').mockResolvedValue({
      id: AI_REQUEST_ID,
      status: 'processing',
    } as never)

    const result = await repo.claim(AI_REQUEST_ID)
    expect(result).toBe('already_processing')
  })

  it('returns not_found when request is missing', async () => {
    const supabase = createMockSupabase({})
    const repo = new AiRequestRepository({ supabase: supabase as never })
    vi.spyOn(repo, 'findById').mockResolvedValue(null)

    const result = await repo.claim(AI_REQUEST_ID)
    expect(result).toBe('not_found')
  })

  it('returns claimed when conditional update succeeds', async () => {
    const supabase = createMockSupabase({})
    const repo = new AiRequestRepository({ supabase: supabase as never })
    vi.spyOn(repo, 'findById').mockResolvedValue({
      id: AI_REQUEST_ID,
      status: 'pending',
    } as never)

    supabase.from = vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: AI_REQUEST_ID }, error: null }),
    }))

    const result = await repo.claim(AI_REQUEST_ID)
    expect(result).toBe('claimed')
  })
})
