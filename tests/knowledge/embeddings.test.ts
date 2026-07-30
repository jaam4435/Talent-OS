import { describe, expect, it, vi, beforeEach } from 'vitest'
import { embedText, embedTexts } from '@/lib/ai/embeddings'
import { AiProviderError } from '@/lib/ai/errors'

describe('embeddings', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.OPENAI_API_KEY = 'test-key'
  })

  it('embedText returns 1536-dim vector', async () => {
    const vector = Array.from({ length: 1536 }, (_, i) => i / 1536)
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ embedding: vector, index: 0 }],
          usage: { prompt_tokens: 10 },
          model: 'text-embedding-3-small',
        }),
        { status: 200 }
      )
    )

    const result = await embedText('hello world')
    expect(result.embedding).toHaveLength(1536)
    expect(result.model).toBe('text-embedding-3-small')
  })

  it('embedTexts batches multiple inputs', async () => {
    const vector = Array.from({ length: 1536 }, () => 0.5)
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { embedding: vector, index: 0 },
            { embedding: vector, index: 1 },
          ],
          usage: { prompt_tokens: 20 },
        }),
        { status: 200 }
      )
    )

    const results = await embedTexts(['a', 'b'])
    expect(results).toHaveLength(2)
  })

  it('throws when API key missing', async () => {
    delete process.env.OPENAI_API_KEY
    await expect(embedText('test')).rejects.toThrow(AiProviderError)
  })
})
