import { getOpportunitiesForPage } from '@/lib/queries/opportunities.queries'
import { getProjectsForPage } from '@/lib/queries/projects.queries'
import { searchTalentRoster } from '@/lib/queries/talent.queries'
import { AllocationForm } from '@/modules/assignment/components/allocation-form'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Assignments · New allocation' }

export default async function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant, user } = await requireManager()
  const params = await searchParams

  const [talent, projectsData, opportunities] = await Promise.all([
    searchTalentRoster(tenant.id, { limit: 100 }),
    getProjectsForPage(tenant.id, tenant.role, user.id),
    getOpportunitiesForPage(tenant.id),
  ])

  return (
    <AllocationForm
      talent={talent.map((row) => ({
        id: row.id,
        full_name: row.full_name,
        discipline: row.discipline,
      }))}
      projects={projectsData.projects.map((project) => ({
        id: project.id,
        title: project.title,
      }))}
      opportunities={opportunities.map((opportunity) => ({
        id: opportunity.id,
        title: opportunity.title,
      }))}
      initialProjectId={typeof params.project_id === 'string' ? params.project_id : undefined}
      initialOpportunityId={
        typeof params.opportunity_id === 'string' ? params.opportunity_id : undefined
      }
    />
  )
}
