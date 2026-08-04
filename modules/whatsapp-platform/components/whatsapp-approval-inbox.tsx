'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { WhatsAppApprovalGate } from '@/modules/whatsapp-platform/types'
import { useWhatsApp } from '@/modules/whatsapp-platform/hooks/use-whatsapp'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { formatDateTime } from '@/modules/core/utils/format'

interface WhatsAppApprovalInboxProps {
  whatsappGates: WhatsAppApprovalGate[]
  workflowApprovalCount: number
}

export function WhatsAppApprovalInbox({
  whatsappGates,
  workflowApprovalCount,
}: WhatsAppApprovalInboxProps) {
  const { api, error, isPending, run } = useWhatsApp()
  const [notes, setNotes] = useState<Record<string, string>>({})

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-sm text-muted-foreground">
        {workflowApprovalCount} shared workflow approval
        {workflowApprovalCount === 1 ? '' : 's'} also available in{' '}
        <Link href="/workflows/approvals" className="font-medium hover:underline">
          workflow approvals
        </Link>
        .
      </p>

      {!whatsappGates.length ? (
        <p className="text-sm text-muted-foreground">No pending WhatsApp approval gates.</p>
      ) : (
        whatsappGates.map((gate) => (
          <div key={gate.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">Approval gate</p>
                <p className="text-sm text-muted-foreground">
                  Request {gate.approvalRequestId.slice(0, 8)}… · {gate.phone ?? 'No phone on file'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Created {formatDateTime(gate.createdAt)}
                </p>
              </div>
              <Badge variant="secondary">Pending</Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {gate.freelancerId ? (
                <Link href={`/whatsapp/${gate.freelancerId}`} className="hover:underline">
                  Open conversation
                </Link>
              ) : gate.phone ? (
                <span className="text-muted-foreground">Fallback link via phone {gate.phone}</span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input
                placeholder="Optional note"
                value={notes[gate.approvalRequestId] ?? ''}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [gate.approvalRequestId]: event.target.value,
                  }))
                }
              />
              <div className="flex gap-2">
                <Button
                  disabled={isPending}
                  onClick={() =>
                    run(() =>
                      api.resolveApproval(gate.approvalRequestId, {
                        decision: 'approved',
                        note: notes[gate.approvalRequestId],
                      })
                    )
                  }
                >
                  Approve
                </Button>
                <Button variant="outline" disabled={isPending} onClick={() =>
                    run(() =>
                      api.resolveApproval(gate.approvalRequestId, {
                        decision: 'rejected',
                        note: notes[gate.approvalRequestId],
                      })
                    )
                  }
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
