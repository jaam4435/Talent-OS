'use client'

import { useTransition } from 'react'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { approvePayment, markPaymentPaid } from '@/app/actions/payments'

interface PaymentActionsProps {
  paymentId: string
  status: string
}

export function PaymentActions({ paymentId, status }: PaymentActionsProps) {
  const [pending, startTransition] = useTransition()

  if (status === 'paid' || status === 'canceled') {
    return null
  }

  if (status === 'pending') {
    return (
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await approvePayment({ paymentId })
          })
        }
      >
        Approve
      </Button>
    )
  }

  if (status === 'approved' || status === 'processing') {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const form = event.currentTarget
          const reference = new FormData(form).get('reference')
          if (typeof reference !== 'string' || !reference.trim()) return
          startTransition(async () => {
            await markPaymentPaid({ paymentId, paymentReference: reference.trim() })
            form.reset()
          })
        }}
      >
        <Input name="reference" placeholder="Payment ref" className="h-8 w-36" required />
        <Button size="sm" type="submit" disabled={pending}>
          Mark paid
        </Button>
      </form>
    )
  }

  return null
}
