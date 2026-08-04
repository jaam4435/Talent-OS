import Link from 'next/link'
import { createServices } from '@/lib/services/factory'
import { requireManager } from '@/modules/core/services/guards'
import { AiFeatureBanner } from '@/components/ai/ai-feature-banner'
import { AgentLauncherGrid } from '@/modules/agents/components/agent-launcher-grid'
import { Button } from '@/modules/core/components/ui/button'

export const metadata = { title: 'AI Agents' }

export default async function AgentsPage() {
  const { tenant } = await requireManager()
  const services = await createServices()
  const agents = await services.agent.listAgents(tenant.id)

  return (
    <div className="space-y-6">
      <AiFeatureBanner tenantId={tenant.id} />
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/agents">Agent settings</Link>
        </Button>
      </div>
      <AgentLauncherGrid agents={agents} />
    </div>
  )
}
