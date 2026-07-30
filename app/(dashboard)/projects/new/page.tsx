import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CreateProjectForm } from '@/components/projects/create-project-form'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { Button } from '@/modules/core/components/ui/button'
import { listCompanies } from '@/lib/companies/queries'
import { createClient } from '@/modules/core/utils/supabase/server'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'New project' }

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = await searchParams
  const supabase = await createClient()

  const opportunityId =
    typeof params.opportunityId === 'string' ? params.opportunityId : undefined
  const freelancerId =
    typeof params.freelancerId === 'string' ? params.freelancerId : undefined

  let defaults: {
    freelancerId?: string
    title?: string
    description?: string
    clientName?: string
    companyId?: string
    budget?: number
    currency?: string
    opportunityId?: string
    shortlistId?: string
  } = {
    currency: tenant.currency,
    freelancerId,
    opportunityId,
  }

  if (opportunityId) {
    const { data: opportunity } = await supabase
      .from('opportunities')
      .select('id, title, description, client_name, company_id, budget, currency')
      .eq('id', opportunityId)
      .eq('tenant_id', tenant.id)
      .maybeSingle()

    if (!opportunity) notFound()

    const { data: shortlist } = await supabase
      .from('shortlists')
      .select('id')
      .eq('opportunity_id', opportunityId)
      .maybeSingle()

    defaults = {
      ...defaults,
      title: opportunity.title,
      description: opportunity.description ?? undefined,
      clientName: opportunity.client_name ?? undefined,
      companyId: opportunity.company_id ?? undefined,
      budget: opportunity.budget ?? undefined,
      currency: opportunity.currency,
      shortlistId: shortlist?.id,
    }
  }

  const [freelancersResult, companies] = await Promise.all([
    supabase
      .from('freelancers')
      .select('id, full_name, email')
      .eq('tenant_id', tenant.id)
      .order('full_name'),
    listCompanies(tenant.id),
  ])

  return (
    <div>
      <PageHeader title="Create project" description="Assign talent and define delivery milestones">
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </PageHeader>

      {freelancersResult.data?.length === 0 ? (
        <div className="mb-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Add at least one freelancer in{' '}
          <Link href="/talent/new" className="font-medium text-foreground underline">
            Talent roster
          </Link>{' '}
          before creating a project.
        </div>
      ) : null}

      <CreateProjectForm
        freelancers={freelancersResult.data ?? []}
        companies={companies.map((c) => ({ id: c.id, name: c.name }))}
        defaults={defaults}
      />
    </div>
  )
}
