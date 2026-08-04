'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CrmActivity, CrmDeal } from '@/modules/crm/types'
import { useCrm } from '@/modules/crm/hooks/use-crm'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { Input } from '@/modules/core/components/ui/input'
import { Label } from '@/modules/core/components/ui/label'
import { formatCurrency, formatDate, formatDateTime } from '@/modules/core/utils/format'
import { useState } from 'react'

interface DealDetailPanelProps {
  deal: CrmDeal
  activities: CrmActivity[]
}

export function DealDetailPanel({ deal, activities }: DealDetailPanelProps) {
  const { api, error, isPending, run } = useCrm()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')

  function logActivity(event: React.FormEvent) {
    event.preventDefault()
    if (!subject.trim()) return

    run(async () => {
      await api.logActivity({
        entity_type: 'deal',
        entity_id: deal.id,
        activity_type: 'note',
        subject: subject.trim(),
        description: description.trim() || null,
      })
      setSubject('')
      setDescription('')
    })
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>{deal.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Stage: {deal.stageName ?? 'Unknown'} · Updated {formatDate(deal.updatedAt)}
              </p>
            </div>
            <Badge variant="secondary">{deal.stageName ?? 'Pipeline'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Value</p>
            <p className="text-sm text-muted-foreground">
              {deal.value != null ? formatCurrency(deal.value, deal.currency) : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Expected close</p>
            <p className="text-sm text-muted-foreground">
              {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Probability</p>
            <p className="text-sm text-muted-foreground">
              {deal.probability != null ? `${deal.probability}%` : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Linked company</p>
            <p className="text-sm text-muted-foreground">
              {deal.companyId ? (
                <Link href={`/crm/companies/${deal.companyId}`} className="hover:underline">
                  View company
                </Link>
              ) : (
                '—'
              )}
            </p>
          </div>
          {deal.opportunityId ? (
            <div className="md:col-span-2">
              <p className="text-sm font-medium">Linked opportunity</p>
              <Link href={`/opportunities/${deal.opportunityId}`} className="text-sm hover:underline">
                View opportunity (read-only link)
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Activity timeline</h2>
        {activities.length ? (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li key={activity.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{activity.subject}</p>
                  <Badge variant="outline" className="capitalize">
                    {activity.activityType}
                  </Badge>
                </div>
                {activity.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateTime(activity.occurredAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No activities logged for this deal yet.</p>
        )}
      </section>

      <form onSubmit={logActivity} className="max-w-xl space-y-4 rounded-lg border p-4">
        <h3 className="font-medium">Log activity</h3>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-description">Description</Label>
          <textarea
            id="activity-description"
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          Add activity
        </Button>
      </form>
    </div>
  )
}
