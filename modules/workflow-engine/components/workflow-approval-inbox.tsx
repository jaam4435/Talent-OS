'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useWorkflows } from '@/modules/workflow-engine/hooks/use-workflows'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { formatDateTime } from '@/modules/core/utils/format'

export interface WorkflowApprovalRow {
  id: string
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  run_id: string
  created_at: string
}

interface WorkflowApprovalInboxProps {
  approvals: WorkflowApprovalRow[]
}

export function WorkflowApprovalInbox({ approvals }: WorkflowApprovalInboxProps) {
  const { api, error, isPending, run } = useWorkflows()
  const [notes, setNotes] = useState<Record<string, string>>({})

  if (!approvals.length) {
    return <p className="text-sm text-muted-foreground">No pending workflow approvals.</p>
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {approvals.map((approval) => (
        <div key={approval.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{approval.title}</p>
              {approval.body ? (
                <p className="mt-1 text-sm text-muted-foreground">{approval.body}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Requested {formatDateTime(approval.created_at)}
              </p>
            </div>
            <Badge variant="secondary">Pending</Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href={`/workflows/runs/${approval.run_id}`} className="hover:underline">
              View run
            </Link>
            {approval.entity_type && approval.entity_id ? (
              <span className="text-muted-foreground">
                · {approval.entity_type} {approval.entity_id.slice(0, 8)}…
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              placeholder="Optional note"
              value={notes[approval.id] ?? ''}
              onChange={(event) =>
                setNotes((current) => ({ ...current, [approval.id]: event.target.value }))
              }
            />
            <div className="flex gap-2">
              <Button
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    api.resolveApproval(approval.id, {
                      decision: 'approved',
                      note: notes[approval.id] || null,
                    })
                  )
                }
              >
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  run(() =>
                    api.resolveApproval(approval.id, {
                      decision: 'rejected',
                      note: notes[approval.id] || null,
                    })
                  )
                }
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
