import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CreateProjectForm } from '@/components/projects/create-project-form'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { Button } from '@/modules/core/components/ui/button'
import { getNewProjectFormData } from '@/lib/queries/projects.queries'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'New project' }

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = await searchParams

  const opportunityId =
    typeof params.opportunityId === 'string' ? params.opportunityId : undefined
  const freelancerId =
    typeof params.freelancerId === 'string' ? params.freelancerId : undefined

  const { freelancers, companies, defaults: opportunityDefaults } = await getNewProjectFormData(
    tenant.id,
    opportunityId
  )

  if (opportunityId && !opportunityDefaults) notFound()

  const defaults = {
    currency: tenant.currency,
    freelancerId,
    opportunityId,
    ...(opportunityDefaults
      ? {
          title: opportunityDefaults.title,
          description: opportunityDefaults.description,
          clientName: opportunityDefaults.clientName,
          companyId: opportunityDefaults.companyId,
          budget: opportunityDefaults.budget,
          currency: opportunityDefaults.currency,
          shortlistId: opportunityDefaults.shortlistId,
        }
      : {}),
  }

  return (
    <div>
      <PageHeader title="Create project" description="Assign talent and define delivery milestones">
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </PageHeader>

      {freelancers.length === 0 ? (
        <div className="mb-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Add at least one freelancer in{' '}
          <Link href="/talent/new" className="font-medium text-foreground underline">
            Talent roster
          </Link>{' '}
          before creating a project.
        </div>
      ) : null}

      <CreateProjectForm
        freelancers={freelancers}
        companies={companies.map((c) => ({ id: c.id, name: c.name }))}
        defaults={defaults}
      />
    </div>
  )
}
