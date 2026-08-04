'use client'

import { useState } from 'react'
import { useFinance } from '@/modules/finance/hooks/use-finance'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { hasPermission } from '@/modules/core/services/permissions'
import type { UserRole } from '@/modules/core/types/enums'

interface PaymentActionsProps {
  paymentId: string
  status: string
  role: UserRole
  disabled?: boolean
}

export function PaymentActions({ paymentId, status, role, disabled }: PaymentActionsProps) {
  const { api, error, isPending, run } = useFinance()
  const [reference, setReference] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const canApprove = hasPermission(role, 'payments:approve') && status === 'pending'
  const canMarkPaid = hasPermission(role, 'payments:pay') && status === 'approved'
  const busy = disabled || isPending

  if (!canApprove && !canMarkPaid) {
    return <span className="text-muted-foreground">—</span>
  }

  function handleApprove() {
    setLocalError(null)
    run(async () => {
      await api.approvePayment(paymentId)
    })
  }

  function handleMarkPaid() {
    setLocalError(null)
    const trimmed = reference.trim()
    if (!trimmed) {
      setLocalError('Payment reference is required')
      return
    }
    run(async () => {
      await api.markPaid(paymentId, trimmed)
      setReference('')
    })
  }

  const message = localError ?? error

  return (
    <div className="flex flex-col gap-2">
      {canApprove && (
        <Button size="sm" variant="outline" disabled={busy} onClick={handleApprove}>
          Approve
        </Button>
      )}
      {canMarkPaid && (
        <div className="flex flex-col gap-1">
          <Input
            placeholder="Payment reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={busy}
            className="h-8 text-xs"
          />
          <Button size="sm" disabled={busy || !reference.trim()} onClick={handleMarkPaid}>
            Mark paid
          </Button>
        </div>
      )}
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  )
}
