import { getProviderApiKey } from '@/lib/ai/config'
import { AiProviderError } from '@/lib/ai/errors'
import { KNOWLEDGE_EMBEDDING_DIMENSIONS } from '@/modules/knowledge/types'

export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'

export interface EmbeddingResult {
  embedding: number[]
  model: string
  inputTokens: number
}

/** Generate a single text embedding via OpenAI (1536 dimensions). */
export async function embedText(text: string, model = DEFAULT_EMBEDDING_MODEL): Promise<EmbeddingResult> {
  const [result] = await embedTexts([text], model)
  return result
}

/** Batch embed multiple texts in one API call. */
export async function embedTexts(
  texts: string[],
  model = DEFAULT_EMBEDDING_MODEL
): Promise<EmbeddingResult[]> {
  if (!texts.length) return []

  const apiKey = getProviderApiKey('openai')
  if (!apiKey) {
    throw new AiProviderError('openai', 'OPENAI_API_KEY not configured for embeddings', 503)
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: texts }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => `HTTP ${response.status}`)
    throw new AiProviderError('openai', body, response.status)
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding: number[]; index: number }>
    usage?: { prompt_tokens?: number }
    model?: string
  }

  const sorted = (json.data ?? []).sort((a, b) => a.index - b.index)
  const tokensPerItem = Math.ceil((json.usage?.prompt_tokens ?? 0) / Math.max(texts.length, 1))

  return sorted.map((item) => {
    if (item.embedding.length !== KNOWLEDGE_EMBEDDING_DIMENSIONS) {
      throw new AiProviderError(
        'openai',
        `Unexpected embedding dimensions: ${item.embedding.length}, expected ${KNOWLEDGE_EMBEDDING_DIMENSIONS}`
      )
    }
    return {
      embedding: item.embedding,
      model: json.model ?? model,
      inputTokens: tokensPerItem,
    }
  })
}
