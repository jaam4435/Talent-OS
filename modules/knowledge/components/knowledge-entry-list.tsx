'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { KnowledgeEntryRow } from '@/modules/knowledge/types'
import { KNOWLEDGE_CATEGORY_LABELS } from '@/modules/knowledge/types'
import { knowledgeApi } from '@/lib/api/knowledge-api'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { formatDateTime } from '@/modules/core/utils/format'

export function KnowledgeEntryList() {
  const [entries, setEntries] = useState<KnowledgeEntryRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    knowledgeApi
      .listEntries({ limit: 50, q: query || undefined })
      .then((data) => {
        if (!cancelled) setEntries(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load entries')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search knowledge…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-md"
        />
        <Button asChild>
          <Link href="/knowledge/new">New entry</Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading entries…</p> : null}

      {!loading && !entries.length ? (
        <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No knowledge entries yet.
        </p>
      ) : (
        <div className="rounded-lg border">
          <ul className="divide-y">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <Link href={`/knowledge/${entry.id}`} className="font-medium hover:underline">
                    {entry.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{KNOWLEDGE_CATEGORY_LABELS[entry.category]}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {entry.embedding_status}
                    </Badge>
                  </div>
                  {entry.summary ? (
                    <p className="mt-2 text-sm text-muted-foreground">{entry.summary}</p>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(entry.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
