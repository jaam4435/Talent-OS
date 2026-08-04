'use client'

import { useEffect, useState } from 'react'
import type { FinancePaymentDetail } from '@/modules/finance/types'
import { useFinance } from '@/modules/finance/hooks/use-finance'
import { PaymentActions } from '@/components/payments/payment-actions'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { formatCurrency, formatDateTime } from '@/modules/core/utils/format'
import type { UserRole } from '@/modules/core/types/enums'
import { cn } from '@/modules/core/utils'

interface PaymentDetailPanelProps {
  paymentId: string
  freelancerName: string
  role: UserRole
}

export function PaymentDetailPanel({ paymentId, freelancerName, role }: PaymentDetailPanelProps) {
  const { api, error, isPending } = useFinance()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<FinancePaymentDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadError(null)
    api
      .getPayment(paymentId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load payment')
      })
    return () => {
      cancelled = true
    }
  }, [open, paymentId, api])

  return (
    <div>
      <Button size="sm" variant="ghost" onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide' : 'View'}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-lg">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <CardTitle>Payment details</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {!detail && !loadError ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : detail ? (
                <>
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Freelancer</span>
                      <span>{freelancerName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span>{formatCurrency(detail.amount, detail.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="secondary" className="capitalize">
                        {detail.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDateTime(detail.createdAt)}</span>
                    </div>
                    {detail.paymentReference ? (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Reference</span>
                        <span className="font-mono text-xs">{detail.paymentReference}</span>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-medium">Status timeline</p>
                    <ol className="space-y-3 border-l pl-4">
                      {detail.timeline.map((event, index) => (
                        <li key={event.id} className="relative">
                          <span
                            className={cn(
                              'absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-background',
                              index === detail.timeline.length - 1
                                ? 'bg-primary'
                                : 'bg-muted-foreground/40'
                            )}
                          />
                          <p className="text-sm font-medium">{event.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(event.occurredAt)}
                          </p>
                          {event.detail ? (
                            <p className="text-xs text-muted-foreground">{event.detail}</p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <PaymentActions
                    paymentId={detail.id}
                    status={detail.status}
                    role={role}
                    disabled={isPending}
                  />
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
