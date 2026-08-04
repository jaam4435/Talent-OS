import Link from 'next/link'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { NotificationInbox } from '@/modules/notifications/components/notification-inbox'
import { Button } from '@/modules/core/components/ui/button'

export const metadata = { title: 'Notifications' }

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Your in-app notifications">
        <Button variant="outline" size="sm" asChild>
          <Link href="/notifications/preferences">Preferences</Link>
        </Button>
      </PageHeader>
      <NotificationInbox />
    </div>
  )
}
