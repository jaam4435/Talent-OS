import { notFound } from 'next/navigation'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { AiSubNav } from '@/components/ai/ai-sub-nav'
import { requireManager } from '@/modules/core/services/guards'

export default async function AiLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireManager()
  } catch {
    notFound()
  }

  return (
    <div>
      <BreadcrumbNav items={[{ label: 'Operations', href: '/ai/agents' }, { label: 'AI' }]} />
      <PageHeader title="AI Console" description="Agents, knowledge base, and matching tools." />
      <AiSubNav />
      {children}
    </div>
  )
}
