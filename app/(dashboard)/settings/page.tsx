import { PageHeader } from '@/modules/core/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'

export const metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Agency configuration and preferences" />
      <Card>
        <CardHeader>
          <CardTitle>Agency settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Timezone, currency, and branding settings will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
