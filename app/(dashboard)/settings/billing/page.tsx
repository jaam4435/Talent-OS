import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { Badge } from '@/modules/core/components/ui/badge'
import { requireAdmin } from '@/modules/core/services/guards'
import { getOrganizationSubscription } from '@/lib/queries/organization.queries'

export const metadata = { title: 'Billing' }

export default async function BillingSettingsPage() {
  const { tenant } = await requireAdmin()
  const subscription = await getOrganizationSubscription(tenant.id)

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: 'Admin', href: '/settings' },
          { label: 'Settings', href: '/settings' },
          { label: 'Billing' },
        ]}
      />
      <PageHeader title="Billing" description="Subscription and billing reference (read-only)" />

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="secondary" className="capitalize">
              {subscription.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Reference</span>
            <span>{subscription.reference ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Tier</span>
            <span>{subscription.tier ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Trial ends</span>
            <span>
              {subscription.trialEndsAt
                ? new Date(subscription.trialEndsAt).toLocaleDateString()
                : '—'}
            </span>
          </div>
          <p className="text-muted-foreground">
            Stripe billing integration is planned for a future sprint. This view reflects the
            workspace subscription reference stored on the organization record.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
