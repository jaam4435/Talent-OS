import Link from 'next/link'
import { Briefcase, Building2, Megaphone, Users } from 'lucide-react'
import { PageHeader, StatCard } from '@/modules/core/components/shared/page-header'
import { Badge } from '@/modules/core/components/ui/badge'
import { requireTenant } from '@/modules/core/services/session'
import { isClientRole, isTalentRole } from '@/modules/core/services/permissions'
import {
  getClientDashboardContext,
  getFreelancerDashboardContext,
  getManagerDashboard,
} from '@/lib/queries/dashboard.queries'
import {
  getClientDashboardProjects,
  getProjectsForFreelancerDashboard,
} from '@/lib/queries/projects.queries'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const { tenant, user } = await requireTenant()

  if (isClientRole(tenant.role)) {
    const { companyName, companyId } = await getClientDashboardContext(user.id, tenant.id)
    const projects = await getClientDashboardProjects(tenant.id, companyId)

    return (
      <div>
        <PageHeader
          title="Client dashboard"
          description={companyName ? `Projects for ${companyName}` : 'Your company projects'}
        />
        {!projects.length ? (
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
    const { freelancerId } = await getFreelancerDashboardContext(user.id, tenant.id)
    const projects = freelancerId ? await getProjectsForFreelancerDashboard(freelancerId) : []

    return (
      <div>
        <PageHeader title="Dashboard" description="Your assigned work" />
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard title="Assigned projects" value={projects.length} icon={Briefcase} />
        </div>
        {projects.length ? (
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

  const { summary, companyCount } = await getManagerDashboard(tenant.id)

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
