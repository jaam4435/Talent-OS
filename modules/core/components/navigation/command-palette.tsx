'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Briefcase,
  Building2,
  GitBranch,
  Search,
  Target,
  Users,
} from 'lucide-react'
import type { SearchEntityType, SearchResult } from '@/modules/core/types/search'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/modules/core/components/ui/dialog'
import { Input } from '@/modules/core/components/ui/input'
import { cn } from '@/modules/core/utils'

const RECENT_KEY = 'talentos:recent-search'
const MAX_RECENT = 5

const TYPE_ICONS: Record<SearchEntityType, typeof Users> = {
  talent: Users,
  project: Briefcase,
  company: Building2,
  deal: GitBranch,
}

function loadRecent(): SearchResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as SearchResult[]) : []
  } catch {
    return []
  }
}

function saveRecent(item: SearchResult) {
  const current = loadRecent().filter((row) => row.href !== item.href)
  const next = [item, ...current].slice(0, MAX_RECENT)
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [recent, setRecent] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const visibleItems = useMemo(
    () => (query.trim().length >= 2 ? results : recent),
    [query, results, recent]
  )

  const openPalette = useCallback(() => {
    setRecent(loadRecent())
    setOpen(true)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openPalette])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
          headers: { 'X-API-Version': 'v1' },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Search failed')
        const json = (await response.json()) as { data: { results: SearchResult[] } }
        setResults(json.data.results)
        setActiveIndex(0)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  function navigate(item: SearchResult) {
    saveRecent(item)
    setOpen(false)
    router.push(item.href)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, visibleItems.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && visibleItems[activeIndex]) {
      event.preventDefault()
      navigate(visibleItems[activeIndex])
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent md:flex"
      >
        <Search className="h-4 w-4" />
        Search…
        <kbd className="ml-4 rounded border bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="sr-only">Search</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search talent, projects, companies, deals…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</p>
            ) : visibleItems.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {query.trim().length >= 2 ? 'No results found.' : 'Recent items appear here.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {visibleItems.map((item, index) => {
                  const Icon = TYPE_ICONS[item.type] ?? Target
                  return (
                    <li key={`${item.type}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => navigate(item)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                          index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.title}</p>
                          {item.subtitle ? (
                            <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                          ) : null}
                        </div>
                        <span className="text-xs capitalize text-muted-foreground">{item.type}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
