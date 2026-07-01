import { Badge } from '@/components/ui/badge'
import { EmptyState, PageHeader } from '@/components/shared/page-header'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { formatCurrency } from '@/lib/utils/format'

export const metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const { tenant } = await requireTenant()
  const supabase = await createClient()

  let query = supabase
    .from('payments')
    .select('id, amount, currency, status, created_at, freelancer_id')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (tenant.role === 'freelancer') {
    const { data: freelancer } = await supabase
      .from('freelancers')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .maybeSingle()

    if (freelancer) query = query.eq('freelancer_id', freelancer.id)
  }

  const { data: payments } = await query

  const freelancerIds = [...new Set(payments?.map((p) => p.freelancer_id) ?? [])]
  const { data: freelancers } = freelancerIds.length
    ? await supabase.from('freelancers').select('id, full_name').in('id', freelancerIds)
    : { data: [] }
  const freelancerMap = new Map(freelancers?.map((f) => [f.id, f]) ?? [])

  return (
    <div>
      <PageHeader title="Payments" description="Track payouts and approvals" />

      {!payments?.length ? (
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
