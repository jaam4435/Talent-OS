import Link from 'next/link'
import { Briefcase, Building2, Megaphone, Users } from 'lucide-react'
import { PageHeader, StatCard } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { isClientRole, isTalentRole } from '@/lib/auth/permissions'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const { tenant, user } = await requireTenant()
  const supabase = await createClient()

  if (isClientRole(tenant.role)) {
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    let projectsQuery = supabase
      .from('projects')
      .select('id, title, status, client_name, budget, currency')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (membership?.company_id) {
      projectsQuery = projectsQuery.eq('company_id', membership.company_id)
    }

    const { data: projects } = await projectsQuery

    const { data: company } = membership?.company_id
      ? await supabase
          .from('companies')
          .select('name')
          .eq('id', membership.company_id)
          .maybeSingle()
      : { data: null }

    return (
      <div>
        <PageHeader
          title="Client dashboard"
          description={company?.name ? `Projects for ${company.name}` : 'Your company projects'}
        />
        {!projects?.length ? (
          <p className="text-sm text-muted-foreground">No projects yet for your company.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-lg border p-5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{project.title}</h3>
                  <Badge className="capitalize">{project.status}</Badge>
                </div>
                {project.client_name ? (
                  <p className="mt-2 text-sm text-muted-foreground">{project.client_name}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (isTalentRole(tenant.role)) {
    const { data: freelancer } = await supabase
      .from('freelancers')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    const { data: projects } = freelancer
      ? await supabase
          .from('projects')
          .select('id, title, status')
          .eq('freelancer_id', freelancer.id)
          .order('created_at', { ascending: false })
          .limit(5)
      : { data: [] }

    return (
      <div>
        <PageHeader title="Dashboard" description="Your assigned work" />
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard title="Assigned projects" value={projects?.length ?? 0} icon={Briefcase} />
        </div>
        {projects?.length ? (
          <ul className="mt-6 divide-y rounded-lg border">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-4">
                <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                  {p.title}
                </Link>
                <Badge className="capitalize">{p.status}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }

  const { data } = await supabase
    .from('v_dashboard_summary')
    .select('*')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const { count: companyCount } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)

  const summary = data as {
    total_freelancers?: number
    active_projects?: number
    open_opportunities?: number
    pending_payments?: number
  } | null

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your agency operations" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Talent profiles" value={summary?.total_freelancers ?? 0} icon={Users} />
        <StatCard title="Companies" value={companyCount ?? 0} icon={Building2} />
        <StatCard title="Active projects" value={summary?.active_projects ?? 0} icon={Briefcase} />
        <StatCard
          title="Open opportunities"
          value={summary?.open_opportunities ?? 0}
          icon={Megaphone}
        />
      </div>
    </div>
  )
}
