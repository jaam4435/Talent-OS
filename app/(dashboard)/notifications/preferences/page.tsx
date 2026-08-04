import Link from 'next/link'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { NotificationPreferencesPanel } from '@/modules/notifications/components/notification-preferences-panel'
import { Button } from '@/modules/core/components/ui/button'

export const metadata = { title: 'Notification preferences' }

export default function NotificationPreferencesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification preferences"
        description="Choose which in-app notification categories you receive"
      />
      <NotificationPreferencesPanel />
      <Button variant="outline" asChild>
        <Link href="/notifications">Back to inbox</Link>
      </Button>
    </div>
  )
}
