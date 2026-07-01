import { Briefcase, CreditCard, Megaphone, Users } from 'lucide-react'
import { PageHeader, StatCard } from '@/components/shared/page-header'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const { tenant } = await requireTenant()
  const supabase = await createClient()

  const { data } = await supabase
    .from('v_dashboard_summary')
    .select('*')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const summary = data as {
    total_freelancers?: number
    active_projects?: number
    open_opportunities?: number
    pending_payments?: number
  } | null

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your agency operations"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Freelancers"
          value={summary?.total_freelancers ?? 0}
          icon={Users}
        />
        <StatCard
          title="Active projects"
          value={summary?.active_projects ?? 0}
          icon={Briefcase}
        />
        <StatCard
          title="Open opportunities"
          value={summary?.open_opportunities ?? 0}
          icon={Megaphone}
        />
        <StatCard
          title="Pending payments"
          value={summary?.pending_payments ?? 0}
          icon={CreditCard}
        />
      </div>
    </div>
  )
}
