import type { KnowledgeCategory, SemanticSearchParams, SemanticSearchResult } from '@/modules/knowledge/types'

const DEFAULT_LIMIT = 10
const DEFAULT_VECTOR_WEIGHT = 0.6

interface FtsHit {
  id: string
  category: KnowledgeCategory
  title: string
  summary: string | null
  content: string | null
  entityType: string | null
  entityId: string | null
  rank: number
}

interface VectorHit {
  entry_id: string
  chunk_id: string
  category: KnowledgeCategory
  title: string
  chunk_content: string
  similarity: number
}

export interface HybridSearchDeps {
  ftsSearch: (params: SemanticSearchParams) => Promise<FtsHit[]>
  vectorSearch: (
    queryEmbedding: number[],
    options?: { categories?: KnowledgeCategory[]; limit?: number }
  ) => Promise<VectorHit[]>
  embedQuery: (query: string) => Promise<number[]>
}

/** Merge FTS and vector hits into a unified ranked result set. */
export async function hybridSemanticSearch(
  params: SemanticSearchParams,
  deps: HybridSearchDeps
): Promise<SemanticSearchResult[]> {
  const limit = params.limit ?? DEFAULT_LIMIT
  const vectorWeight = params.vectorWeight ?? DEFAULT_VECTOR_WEIGHT
  const ftsWeight = 1 - vectorWeight
  const fetchLimit = Math.min(limit * 2, 50)

  const queryEmbedding = await deps.embedQuery(params.query)

  const [ftsResults, vectorResults] = await Promise.all([
    deps.ftsSearch({ ...params, limit: fetchLimit }),
    deps.vectorSearch(queryEmbedding, { categories: params.categories, limit: fetchLimit }),
  ])

  const merged = new Map<string, SemanticSearchResult>()

  for (const hit of ftsResults) {
    const normalizedRank = normalizeFtsRank(hit.rank)
    merged.set(hit.id, {
      id: hit.id,
      category: hit.category,
      title: hit.title,
      summary: hit.summary,
      content: hit.content,
      entityType: hit.entityType,
      entityId: hit.entityId,
      rank: hit.rank,
      score: normalizedRank * ftsWeight,
      matchSources: ['fts'],
    })
  }

  for (const hit of vectorResults) {
    const existing = merged.get(hit.entry_id)
    const vectorScore = hit.similarity

    if (existing) {
      existing.score += vectorScore * vectorWeight
      existing.matchSources.push('vector')
      existing.similarity = Math.max(existing.similarity ?? 0, vectorScore)
      if (!existing.chunkContent) existing.chunkContent = hit.chunk_content
    } else {
      merged.set(hit.entry_id, {
        id: hit.entry_id,
        category: hit.category,
        title: hit.title,
        summary: null,
        content: hit.chunk_content,
        entityType: null,
        entityId: null,
        rank: vectorScore,
        score: vectorScore * vectorWeight,
        matchSources: ['vector'],
        chunkContent: hit.chunk_content,
        similarity: vectorScore,
      })
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function normalizeFtsRank(rank: number): number {
  // ts_rank typically 0–1; clamp for hybrid scoring
  if (!Number.isFinite(rank) || rank <= 0) return 0.01
  return Math.min(rank, 1)
}
