'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_CATEGORY_LABELS,
  type KnowledgeCategory,
  type KnowledgeEntryRow,
} from '@/modules/knowledge/types'
import { knowledgeApi } from '@/lib/api/knowledge-api'
import { getUserMessageForApiError } from '@/lib/api/user-messages'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'

interface KnowledgeEntryFormProps {
  entry?: KnowledgeEntryRow
}

export function KnowledgeEntryForm({ entry }: KnowledgeEntryFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(entry?.title ?? '')
  const [category, setCategory] = useState<KnowledgeCategory>(entry?.category ?? 'document')
  const [summary, setSummary] = useState(entry?.summary ?? '')
  const [content, setContent] = useState(entry?.content ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        if (entry) {
          await knowledgeApi.updateEntry(entry.id, { title, summary, content })
          router.push(`/knowledge/${entry.id}`)
        } else {
          const created = await knowledgeApi.createEntry({
            category,
            title,
            summary: summary || null,
            content: content || null,
          })
          router.push(`/knowledge/${created.id}`)
        }
        router.refresh()
      } catch (err) {
        setError(getUserMessageForApiError(err))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{entry ? 'Edit knowledge entry' : 'Create knowledge entry'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!entry ? (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value as KnowledgeCategory)}
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {KNOWLEDGE_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {KNOWLEDGE_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <textarea
              id="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={10}
              className="flex w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {entry ? 'Save changes' : 'Create entry'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
