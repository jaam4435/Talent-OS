import Link from 'next/link'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { ProjectKanban } from '@/components/projects/project-kanban'
import { EmptyState, PageHeader } from '@/modules/core/components/shared/page-header'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'
import { getProjectsForPage } from '@/lib/queries/projects.queries'
import type { ProjectStatus } from '@/modules/core/types/enums'

export const metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const { tenant, user } = await requireTenant()
  const { projects, freelancerMap } = await getProjectsForPage(tenant.id, tenant.role, user.id)

  const kanbanProjects = projects.map((project) => ({
    id: project.id,
    title: project.title,
    status: project.status as ProjectStatus,
    clientName: project.client_name,
    freelancerName: freelancerMap.get(project.freelancer_id)?.full_name ?? null,
  }))

  return (
    <div>
      <PageHeader title="Projects" description="Track active engagements and milestones">
        {isManager(tenant.role) ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/projects/templates">Templates</Link>
            </Button>
            <Button asChild>
              <Link href="/projects/new">New project</Link>
            </Button>
          </div>
        ) : null}
      </PageHeader>

      {!projects.length ? (
        <EmptyState
          title="No projects"
          description="Assign talent from a shortlist or create a project manually."
          action={
            isManager(tenant.role) ? (
              <Button asChild>
                <Link href="/projects/new">Create project</Link>
              </Button>
            ) : undefined
          }
        />
      ) : isManager(tenant.role) ? (
        <ProjectKanban projects={kanbanProjects} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const freelancer = freelancerMap.get(project.freelancer_id)
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-lg border p-5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{project.title}</h3>
                  <Badge variant="secondary" className="capitalize">
                    {project.status}
                  </Badge>
                </div>
                {freelancer ? (
                  <p className="mt-2 text-sm text-muted-foreground">{freelancer.full_name}</p>
                ) : null}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
