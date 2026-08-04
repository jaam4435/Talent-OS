'use client'

import { useState, useTransition } from 'react'
import { approvePayment, markPaymentPaid } from '@/app/actions/payments'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { hasPermission } from '@/modules/core/services/permissions'
import type { UserRole } from '@/modules/core/types/enums'

interface PaymentActionsProps {
  paymentId: string
  status: string
  role: UserRole
}

export function PaymentActions({ paymentId, status, role }: PaymentActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canApprove = hasPermission(role, 'payments:approve') && status === 'pending'
  const canMarkPaid = hasPermission(role, 'payments:pay') && status === 'approved'

  if (!canApprove && !canMarkPaid) {
    return <span className="text-muted-foreground">—</span>
  }

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approvePayment(paymentId)
      if (!result.ok) setError(result.error)
    })
  }

  function handleMarkPaid() {
    setError(null)
    startTransition(async () => {
      const result = await markPaymentPaid(paymentId, reference)
      if (!result.ok) setError(result.error)
      else setReference('')
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {canApprove && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={handleApprove}>
          Approve
        </Button>
      )}
      {canMarkPaid && (
        <div className="flex flex-col gap-1">
          <Input
            placeholder="Payment reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={isPending}
            className="h-8 text-xs"
          />
          <Button size="sm" disabled={isPending || !reference.trim()} onClick={handleMarkPaid}>
            Mark paid
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
