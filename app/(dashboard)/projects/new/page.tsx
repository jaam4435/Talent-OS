import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CreateProjectForm } from '@/components/projects/create-project-form'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/auth/guards'

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
      .select('id, title, description, client_name, budget, currency')
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
      budget: opportunity.budget ?? undefined,
      currency: opportunity.currency,
      shortlistId: shortlist?.id,
    }
  }

  const { data: freelancers } = await supabase
    .from('freelancers')
    .select('id, full_name, email')
    .eq('tenant_id', tenant.id)
    .order('full_name')

  return (
    <div>
      <PageHeader title="Create project" description="Assign talent and define delivery milestones">
        <Button asChild variant="outline">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </PageHeader>

      <CreateProjectForm freelancers={freelancers ?? []} defaults={defaults} />
    </div>
  )
}
