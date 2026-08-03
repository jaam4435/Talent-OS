import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { ProjectHealthBadge } from '@/components/projects/project-health-badge'
import { ProjectStatusControls } from '@/components/projects/project-status-controls'
import { ProjectSubNav } from '@/components/projects/project-sub-nav'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { createServices } from '@/lib/services/factory'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'
import { getProjectDetail } from '@/lib/queries/projects.queries'
import type { ProjectStatus } from '@/modules/core/types/enums'

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireTenant()
  const manager = isManager(tenant.role)

  const detail = await getProjectDetail(id, tenant.id)
  if (!detail) notFound()

  const services = await createServices()
  const health = await services.projectModule.getHealth(tenant.id, id)
  const { project, freelancer } = detail

  return (
    <div>
      <BreadcrumbNav
        items={[
          { label: 'Delivery', href: '/projects' },
          { label: 'Projects', href: '/projects' },
          { label: project.title },
        ]}
      />
      <PageHeader
        title={project.title}
        description={freelancer ? `Assigned to ${freelancer.full_name}` : undefined}
      >
        <Button asChild variant="outline">
          <Link href="/projects">All projects</Link>
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className="capitalize">{project.status}</Badge>
        {project.client_name ? <Badge variant="outline">{project.client_name}</Badge> : null}
        {health ? (
          <ProjectHealthBadge
            healthStatus={health.healthStatus}
            healthScore={health.healthScore}
          />
        ) : null}
      </div>

      {manager ? (
        <div className="mb-6">
          <ProjectStatusControls projectId={project.id} status={project.status as ProjectStatus} />
        </div>
      ) : null}

      <ProjectSubNav projectId={project.id} />
      {children}
    </div>
  )
}
