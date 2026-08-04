import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServices } from '@/lib/services/factory'
import { requireManager } from '@/modules/core/services/guards'
import { KnowledgeEntryForm } from '@/modules/knowledge/components/knowledge-entry-form'
import { KNOWLEDGE_CATEGORY_LABELS } from '@/modules/knowledge/types'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { formatDateTime } from '@/modules/core/utils/format'

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireManager()
  const services = await createServices()
  const detail = await services.knowledge.getEntry(id, tenant.id)
  if (!detail) notFound()

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{detail.entry.title}</CardTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{KNOWLEDGE_CATEGORY_LABELS[detail.entry.category]}</Badge>
                <Badge variant="outline" className="capitalize">
                  {detail.entry.embedding_status}
                </Badge>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/knowledge">Back</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {detail.entry.summary ? <p className="text-muted-foreground">{detail.entry.summary}</p> : null}
          <div className="whitespace-pre-wrap">{detail.entry.content ?? 'No content yet.'}</div>
          <p className="text-xs text-muted-foreground">
            Updated {formatDateTime(detail.entry.updated_at)}
          </p>
        </CardContent>
      </Card>

      <KnowledgeEntryForm entry={detail.entry} />
    </div>
  )
}
