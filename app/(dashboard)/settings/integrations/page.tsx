import { PageHeader } from '@/modules/core/components/shared/page-header'

export const metadata = { title: 'Integrations' }

export default function IntegrationsSettingsPage() {
  return (
    <PageHeader
      title="Integrations"
      description="Configure WhatsApp, n8n, and email providers"
    />
  )
}
