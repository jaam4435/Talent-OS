import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { EmptyState, PageHeader } from '@/components/shared/page-header'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'

export const metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const { tenant } = await requireTenant()
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('id, title, status, client_name, freelancer_id')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (tenant.role === 'freelancer') {
    const { data: freelancer } = await supabase
      .from('freelancers')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .maybeSingle()

    if (freelancer) {
      query = query.eq('freelancer_id', freelancer.id)
    }
  }

  const { data: projects } = await query

  const freelancerIds = [...new Set(projects?.map((p) => p.freelancer_id) ?? [])]
  const { data: freelancers } = freelancerIds.length
    ? await supabase.from('freelancers').select('id, full_name').in('id', freelancerIds)
    : { data: [] }
  const freelancerMap = new Map(freelancers?.map((f) => [f.id, f]) ?? [])

  return (
    <div>
      <PageHeader title="Projects" description="Track active engagements and milestones" />

      {!projects?.length ? (
        <EmptyState
          title="No projects"
          description="Assign talent from a shortlist to create your first project."
        />
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
