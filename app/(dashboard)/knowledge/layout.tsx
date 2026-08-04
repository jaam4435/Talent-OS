import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { AiSubNav } from '@/components/ai/ai-sub-nav'
import { requireManager } from '@/modules/core/services/guards'

export default async function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireManager()
  } catch {
    notFound()
  }

  return (
    <div>
      <BreadcrumbNav items={[{ label: 'Operations', href: '/knowledge' }, { label: 'Knowledge' }]} />
      <PageHeader title="Knowledge Base" description="Searchable agency knowledge and SOPs." />
      <AiSubNav />
      {children}
    </div>
  )
}
