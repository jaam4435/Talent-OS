import Link from 'next/link'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { AgentSettingsForm } from '@/modules/agents/components/agent-settings-form'
import { Button } from '@/modules/core/components/ui/button'
import { requireAdmin } from '@/modules/core/services/guards'
import { createServices } from '@/lib/services/factory'

export const metadata = { title: 'Agent settings' }

export default async function AgentSettingsPage() {
  const { tenant } = await requireAdmin()
  const services = await createServices()
  const agents = await services.agent.listAgents(tenant.id)

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin' }, { label: 'Agent settings' }]} />
      <PageHeader title="Agent settings" description="Enable agents and review allowed tools.">
        <Button asChild variant="outline" size="sm">
          <Link href="/ai/agents">Open agent console</Link>
        </Button>
      </PageHeader>
      <AgentSettingsForm agents={agents} />
    </div>
  )
}
