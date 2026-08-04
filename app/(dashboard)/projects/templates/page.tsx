import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { TemplateLibrary } from '@/components/projects/template-library'
import { requireManager } from '@/modules/core/services/guards'
import { getNewProjectFormData } from '@/lib/queries/projects.queries'

export const metadata = { title: 'Project templates' }

export default async function ProjectTemplatesPage() {
  let tenant
  try {
    ;({ tenant } = await requireManager())
  } catch {
    notFound()
  }

  const { freelancers } = await getNewProjectFormData(tenant.id)

  return (
    <div>
      <BreadcrumbNav
        items={[
          { label: 'Delivery', href: '/projects' },
          { label: 'Projects', href: '/projects' },
          { label: 'Templates' },
        ]}
      />
      <PageHeader
        title="Project templates"
        description="Apply reusable kickoff blueprints to create new projects."
      />
      <TemplateLibrary
        freelancers={freelancers.map((row) => ({
          id: row.id,
          fullName: row.full_name,
        }))}
      />
    </div>
  )
}
