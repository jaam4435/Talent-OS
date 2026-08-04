import Link from 'next/link'
import { Building2, CreditCard, Plug, Users } from 'lucide-react'
import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'
import { PageHeader } from '@/modules/core/components/shared/page-header'
import { OrganizationBrandingForm } from '@/modules/organization/components/organization-forms'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { requireAdmin } from '@/modules/core/services/guards'
import { getOrganizationSummary } from '@/lib/queries/organization.queries'

export const metadata = { title: 'Settings' }

const LINKS = [
  {
    href: '/organization',
    title: 'Organization',
    description: 'Members, departments, teams, invitations, and audit log.',
    icon: Building2,
  },
  {
    href: '/organization/members',
    title: 'Team members',
    description: 'Manage roles, status, and workspace access.',
    icon: Users,
  },
  {
    href: '/settings/billing',
    title: 'Billing',
    description: 'Subscription status and billing reference.',
    icon: CreditCard,
  },
  {
    href: '/settings/integrations',
    title: 'Integrations',
    description: 'WhatsApp, n8n, and third-party connections.',
    icon: Plug,
  },
] as const

export default async function SettingsPage() {
  const { tenant } = await requireAdmin()
  const organization = await getOrganizationSummary(tenant.id)

  return (
    <div className="space-y-8">
      <BreadcrumbNav items={[{ label: 'Admin' }, { label: 'Settings' }]} />
      <PageHeader title="Settings" description="Agency configuration and workspace administration" />

      <div className="grid gap-4 md:grid-cols-2">
        {LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className="block rounded-lg border p-4 transition-colors hover:bg-accent/40">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{link.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {organization ? (
        <OrganizationBrandingForm
          initial={{
            logoUrl: organization.branding.logoUrl,
            primaryColor: organization.branding.primaryColor,
            accentColor: organization.branding.accentColor,
          }}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Organization details unavailable.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
