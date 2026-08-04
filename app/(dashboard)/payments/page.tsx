import { Badge } from '@/modules/core/components/ui/badge'
import { EmptyState, PageHeader } from '@/modules/core/components/shared/page-header'
import { requireTenant } from '@/modules/core/services/session'
import { formatCurrency } from '@/modules/core/utils/format'
import { getPaymentsForPage } from '@/lib/queries/payments.queries'
import { PaymentActions } from '@/components/payments/payment-actions'
import { PaymentDetailPanel } from '@/modules/finance/components/payment-detail-panel'

export const metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const { tenant, user } = await requireTenant()
  const { payments, freelancerMap } = await getPaymentsForPage(tenant.id, tenant.role, user.id)

  return (
    <div>
      <PageHeader title="Payments" description="Track payouts and approvals" />

      {!payments.length ? (
        <EmptyState
          title="No payments"
          description="Payments are created when milestones are approved."
        />
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-4 font-medium">Freelancer</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Created</th>
                <th className="p-4 font-medium">Detail</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const freelancer = freelancerMap.get(payment.freelancer_id)
                return (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="p-4">{freelancer?.full_name ?? '—'}</td>
                    <td className="p-4">
                      {formatCurrency(Number(payment.amount), payment.currency)}
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className="capitalize">
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <PaymentDetailPanel
                        paymentId={payment.id}
                        freelancerName={freelancer?.full_name ?? '—'}
                        role={tenant.role}
                      />
                    </td>
                    <td className="p-4">
                      <PaymentActions
                        paymentId={payment.id}
                        status={payment.status}
                        role={tenant.role}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
