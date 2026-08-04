import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { OrganizationSubNav } from '@/modules/organization/components/organization-sub-nav'
import { requireAdmin } from '@/modules/core/services/guards'

export default async function OrganizationLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin()
  } catch {
    notFound()
  }

  return (
    <div>
      <BreadcrumbNav items={[{ label: 'Admin', href: '/settings' }, { label: 'Organization' }]} />
      <PageHeader
        title="Organization"
        description="Manage workspace structure, members, and invitations."
      />
      <OrganizationSubNav />
      {children}
    </div>
  )
}
