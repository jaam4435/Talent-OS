import { getCrmPipelineBoard } from '@/lib/queries/crm.queries'
import { PipelineBoard } from '@/modules/crm/components/pipeline-board'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'CRM · Pipeline' }

export default async function CrmPipelinePage() {
  const { tenant } = await requireManager()
  const board = await getCrmPipelineBoard(tenant.id)

  return <PipelineBoard board={board} />
}
