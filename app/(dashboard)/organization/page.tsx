import {
  getOrganizationOverviewCounts,
  getOrganizationSummary,
} from '@/lib/queries/organization.queries'
import {
  OrganizationBrandingForm,
  OrganizationGeneralForm,
  OrganizationOverviewCards,
} from '@/modules/organization/components/organization-forms'
import { requireAdmin } from '@/modules/core/services/guards'

export const metadata = { title: 'Organization' }

export default async function OrganizationPage() {
  const { tenant } = await requireAdmin()
  const [organization, counts] = await Promise.all([
    getOrganizationSummary(tenant.id),
    getOrganizationOverviewCounts(tenant.id),
  ])

  if (!organization) {
    return <p className="text-sm text-muted-foreground">Organization not found.</p>
  }

  return (
    <div className="space-y-8">
      <OrganizationOverviewCards
        memberCount={counts.memberCount}
        pendingInvites={counts.pendingInvites}
        departmentCount={counts.departmentCount}
        teamCount={counts.teamCount}
      />
      <OrganizationGeneralForm
        initial={{
          name: organization.name,
          timezone: organization.settings.timezone,
          currency: organization.settings.currency,
        }}
      />
      <OrganizationBrandingForm
        initial={{
          logoUrl: organization.branding.logoUrl,
          primaryColor: organization.branding.primaryColor,
          accentColor: organization.branding.accentColor,
        }}
      />
    </div>
  )
}
