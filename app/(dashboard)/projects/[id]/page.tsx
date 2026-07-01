import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProjectTracker } from '@/components/projects/project-tracker'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import type { MilestoneRow } from '@/lib/projects/types'
import type { ProjectStatus } from '@/types/enums'
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
    .select(
      'id, title, description, status, due_date, amount, sort_order, submission_note, submitted_at, review_note'
    )
    .eq('project_id', id)
    .order('sort_order')

  const { data: activity } = await supabase
    .from('activity_logs')
    .select('action, metadata, created_at')
    .eq('entity_type', 'project')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const milestoneRows: MilestoneRow[] = (milestones ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    amount: Number(m.amount),
    dueDate: m.due_date,
    status: m.status as MilestoneRow['status'],
    sortOrder: m.sort_order,
    submissionNote: m.submission_note,
    submittedAt: m.submitted_at,
    reviewNote: m.review_note,
  }))

  return (
    <div>
      <PageHeader
        title={project.title}
        description={freelancer ? `Assigned to ${freelancer.full_name}` : undefined}
      >
        <Button asChild variant="outline">
          <Link href="/projects">All projects</Link>
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge className="capitalize">{project.status}</Badge>
        {project.client_name ? <Badge variant="outline">{project.client_name}</Badge> : null}
      </div>

      <ProjectTracker
        projectId={project.id}
        status={project.status as ProjectStatus}
        role={tenant.role}
        milestones={milestoneRows}
        budget={project.budget}
        currency={project.currency}
      />

      {activity?.length ? (
        <div className="mt-8 rounded-lg border">
          <div className="border-b p-4 font-medium">Recent activity</div>
          <ul className="divide-y">
            {activity.map((entry, index) => (
              <li key={index} className="p-4 text-sm">
                <p className="font-medium capitalize">{entry.action.replace('_', ' ')}</p>
                <p className="text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
