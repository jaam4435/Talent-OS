import { listWorkflowDefinitions } from '@/lib/queries/workflow.queries'
import { WorkflowDefinitionsCatalog } from '@/modules/workflow-engine/components/workflow-definitions-catalog'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'Workflows · Definitions' }

export default async function WorkflowDefinitionsPage() {
  const { tenant } = await requireManager()
  const definitions = await listWorkflowDefinitions(tenant.id)

  return (
    <WorkflowDefinitionsCatalog registry={definitions.registry} stored={definitions.stored} />
  )
}
