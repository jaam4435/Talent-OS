import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import type { Tables } from '@/types/database'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireTenant()
  const supabase = await createClient()

  const { data: projectData } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const project = projectData as Tables<'projects'> | null

  if (!project) notFound()

  const { data: freelancer } = await supabase
    .from('freelancers')
    .select('full_name, email')
    .eq('id', project.freelancer_id)
    .maybeSingle()

  const { data: milestones } = await supabase
    .from('milestones')
    .select('id, title, status, due_date, amount')
    .eq('project_id', id)
    .order('sort_order')

  return (
    <div>
      <PageHeader
        title={project.title}
        description={freelancer ? `Assigned to ${freelancer.full_name}` : undefined}
      />
      <Badge className="mb-6 capitalize">{project.status}</Badge>

      <div className="rounded-lg border">
        <div className="border-b p-4 font-medium">Milestones</div>
        {!milestones?.length ? (
          <p className="p-4 text-sm text-muted-foreground">No milestones defined</p>
        ) : (
          <ul className="divide-y">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">{m.title}</p>
                  {m.due_date ? (
                    <p className="text-muted-foreground">Due {m.due_date}</p>
                  ) : null}
                </div>
                <Badge variant="secondary" className="capitalize">
                  {m.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
