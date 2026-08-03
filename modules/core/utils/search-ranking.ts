import type { SearchResult } from '@/modules/core/types/search'

/** Score a label against a query — higher is better. */
export function scoreLabelMatch(label: string, query: string): number {
  const haystack = label.trim().toLowerCase()
  const needle = query.trim().toLowerCase()
  if (!haystack || !needle) return 0
  if (haystack === needle) return 100
  if (haystack.startsWith(needle)) return 80
  if (haystack.includes(needle)) return 50
  return 0
}

export function rankSearchResults(results: SearchResult[], query: string): SearchResult[] {
  const needle = query.trim().toLowerCase()
  return [...results]
    .map((result) => ({
      ...result,
      score: Math.max(result.score, scoreLabelMatch(result.title, needle)),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
}
