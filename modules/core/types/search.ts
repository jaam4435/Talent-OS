export type SearchEntityType = 'talent' | 'project' | 'company' | 'deal'

export interface SearchResult {
  id: string
  type: SearchEntityType
  title: string
  subtitle: string | null
  href: string
  score: number
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  tookMs: number
}
