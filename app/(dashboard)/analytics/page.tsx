import { PageHeader } from '@/modules/core/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'

export const metadata = { title: 'Analytics' }

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader title="Analytics" description="Fill rate, utilization, and payment aging" />
      <Card>
        <CardHeader>
          <CardTitle>Charts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analytics charts (recharts) will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
