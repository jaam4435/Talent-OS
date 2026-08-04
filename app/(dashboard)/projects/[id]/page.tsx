import { ProjectTracker } from '@/components/projects/project-tracker'
import { AiSummaryCard } from '@/components/ai/ai-summary-card'
import { StatusAssessmentCard } from '@/components/ai/status-assessment-card'
import { runProjectSummary } from '@/app/actions/ai-pm'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'
import { getProjectDetail, mapProjectMilestones } from '@/lib/queries/projects.queries'
import { listProjectAssignments } from '@/lib/queries/assignment.queries'
import { getProjectSummaryResult, getStatusAssessmentResult } from '@/lib/queries/ai.queries'
import { ProjectAssignmentSummary } from '@/modules/assignment/components/project-assignment-summary'
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
  if (!detail) return null

  const { project, milestones, activity } = detail
  const milestoneRows = mapProjectMilestones(milestones)

  const pmData = manager
    ? await Promise.all([
        getProjectSummaryResult(id, tenant.id),
        getStatusAssessmentResult(id, tenant.id),
        listProjectAssignments(tenant.id, id),
      ])
    : null

  return (
    <div>
      {manager && pmData ? (
        <>
          <ProjectAssignmentSummary
            projectId={project.id}
            projectFreelancerId={project.freelancer_id}
            allocations={pmData[2].data}
          />
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
        </>
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
