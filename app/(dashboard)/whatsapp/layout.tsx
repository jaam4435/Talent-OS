import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { WhatsAppSubNav } from '@/modules/whatsapp-platform/components/whatsapp-sub-nav'
import { requireManager } from '@/modules/core/services/guards'

export default async function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireManager()
  } catch {
    notFound()
  }

  return (
    <div>
      <BreadcrumbNav
        items={[{ label: 'Operations', href: '/whatsapp' }, { label: 'WhatsApp' }]}
      />
      <PageHeader
        title="WhatsApp"
        description="Browse freelancer conversations, memory threads, and approval gates."
      />
      <WhatsAppSubNav />
      {children}
    </div>
  )
}
