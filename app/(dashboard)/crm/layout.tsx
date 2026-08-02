import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { CrmSubNav } from '@/modules/crm/components/crm-sub-nav'
import { requireManager } from '@/modules/core/services/guards'

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireManager()
  } catch {
    notFound()
  }

  return (
    <div>
      <BreadcrumbNav items={[{ label: 'Demand', href: '/opportunities' }, { label: 'CRM' }]} />
      <PageHeader title="CRM" description="Manage pipeline, leads, companies, and contracts." />
      <CrmSubNav />
      {children}
    </div>
  )
}
