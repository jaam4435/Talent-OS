import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProjectTracker } from '@/components/projects/project-tracker'
import { AiSummaryCard } from '@/components/ai/ai-summary-card'
import { StatusAssessmentCard } from '@/components/ai/status-assessment-card'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { runProjectSummary } from '@/app/actions/ai-pm'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'
import { getProjectDetail, mapProjectMilestones } from '@/lib/queries/projects.queries'
import { getProjectSummaryResult, getStatusAssessmentResult } from '@/lib/queries/ai.queries'
import type { ProjectStatus } from '@/modules/core/types/enums'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireTenant()
  const manager = isManager(tenant.role)

  const detail = await getProjectDetail(id, tenant.id)
  if (!detail) notFound()

  const { project, milestones, freelancer, activity } = detail
  const milestoneRows = mapProjectMilestones(milestones)

  const pmData = manager
    ? await Promise.all([
        getProjectSummaryResult(id, tenant.id),
        getStatusAssessmentResult(id, tenant.id),
      ])
    : null

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

      {manager && pmData ? (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <AiSummaryCard
            title="AI project summary"
            description="Auto-generated status narrative from milestones and activity."
            actionLabel="Generate summary"
            pollUrl={`/api/ai/pm/project/${id}`}
            initialSummary={(pmData[0].summary as Record<string, unknown> | null) ?? null}
            initialRequest={pmData[0].latestRequest}
            onRun={async () => runProjectSummary(id)}
            renderSummary={(summary) => (
              <div className="space-y-3 text-sm">
                <p>{String(summary.summary_text ?? '')}</p>
                {Array.isArray(summary.highlights) && summary.highlights.length ? (
                  <div>
                    <p className="font-medium">Highlights</p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {summary.highlights.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(summary.blockers) && summary.blockers.length ? (
                  <div>
                    <p className="font-medium">Blockers</p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {summary.blockers.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(summary.next_actions) && summary.next_actions.length ? (
                  <div>
                    <p className="font-medium">Next actions</p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {summary.next_actions.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          />
          <StatusAssessmentCard
            projectId={id}
            currentStatus={project.status}
            initialAssessment={(pmData[1].assessment as Record<string, unknown> | null) ?? null}
            initialRequest={pmData[1].latestRequest}
          />
        </div>
      ) : null}

      <ProjectTracker
        projectId={project.id}
        status={project.status as ProjectStatus}
        role={tenant.role}
        milestones={milestoneRows}
        budget={project.budget}
        currency={project.currency}
      />

      {activity.length ? (
        <div className="mt-8 rounded-lg border">
          <div className="border-b p-4 font-medium">Recent activity</div>
          <ul className="divide-y">
            {activity.map((entry, index) => (
              <li key={index} className="p-4 text-sm">
                <p className="font-medium capitalize">{entry.action.replaceAll('_', ' ')}</p>
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
