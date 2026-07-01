'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star } from 'lucide-react'
import {
  rejectShortlistCandidate,
  updateShortlistItem,
} from '@/app/actions/shortlists'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/format'
import type { ShortlistItemView } from '@/lib/shortlists/queries'

const REJECTION_REASONS = [
  'Skills mismatch',
  'Rate too high',
  'Unavailable',
  'Client preference',
  'Other',
]

interface ShortlistBoardProps {
  opportunityId: string
  items: ShortlistItemView[]
}

export function ShortlistBoard({ opportunityId, items }: ShortlistBoardProps) {
  const router = useRouter()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0])
  const [rejectNote, setRejectNote] = useState('')
  const [isPending, startTransition] = useTransition()

  const topScore = Math.max(...items.map((i) => i.matchScore ?? 0), 0)

  function handleNotesChange(itemId: string, notes: string) {
    startTransition(async () => {
      await updateShortlistItem(itemId, opportunityId, { notes })
      router.refresh()
    })
  }

  function handleReject(itemId: string) {
    const reason = rejectNote.trim()
      ? `${rejectReason}: ${rejectNote.trim()}`
      : rejectReason

    startTransition(async () => {
      const result = await rejectShortlistCandidate(itemId, opportunityId, reason)
      if (result.ok) {
        setRejectingId(null)
        setRejectNote('')
        router.refresh()
      }
    })
  }

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No shortlisted candidates yet. Add from AI matches or interested responses.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="p-3 font-medium">Candidate</th>
            <th className="p-3 font-medium">AI score</th>
            <th className="p-3 font-medium">Rate</th>
            <th className="p-3 font-medium">Rating</th>
            <th className="p-3 font-medium">Response</th>
            <th className="p-3 font-medium">Notes</th>
            <th className="p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isRecommended = item.matchScore !== null && item.matchScore === topScore && topScore > 0
            const assignUrl = `/projects/new?opportunityId=${opportunityId}&freelancerId=${item.freelancerId}`

            return (
              <tr key={item.id} className="border-b last:border-0 align-top">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {isRecommended ? (
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-label="Recommended" />
                    ) : null}
                    <div>
                      <Link
                        href={`/talent/${item.freelancer.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.freelancer.full_name}
                      </Link>
                      <p className="text-muted-foreground">{item.freelancer.email}</p>
                      <Badge variant="outline" className="mt-1 capitalize text-xs">
                        {item.freelancer.discipline}
                      </Badge>
                    </div>
                  </div>
                </td>
                <td className="p-3 tabular-nums">
                  {item.matchScore !== null ? `${item.matchScore.toFixed(0)}%` : '—'}
                </td>
                <td className="p-3">
                  {item.freelancer.day_rate
                    ? formatCurrency(Number(item.freelancer.day_rate), item.freelancer.currency)
                    : '—'}
                </td>
                <td className="p-3">{item.freelancer.internal_rating ?? '—'}</td>
                <td className="p-3">
                  <Badge variant="secondary" className="capitalize">
                    {item.response ?? 'not invited'}
                  </Badge>
                </td>
                <td className="p-3 min-w-[180px]">
                  <Input
                    defaultValue={item.notes ?? ''}
                    placeholder="Add notes..."
                    onBlur={(e) => {
                      if (e.target.value !== (item.notes ?? '')) {
                        handleNotesChange(item.id, e.target.value)
                      }
                    }}
                  />
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-2">
                    <Button asChild size="sm">
                      <Link href={assignUrl}>Assign project</Link>
                    </Button>
                    {rejectingId === item.id ? (
                      <div className="space-y-2 rounded border p-2">
                        <select
                          className="w-full rounded border px-2 py-1 text-xs"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        >
                          {REJECTION_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <Input
                          placeholder="Optional detail"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          className="text-xs"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => handleReject(item.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRejectingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectingId(item.id)}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
