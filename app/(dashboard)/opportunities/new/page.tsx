import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'New opportunity' }

export default function NewOpportunityPage() {
  return (
    <div>
      <PageHeader title="New opportunity" description="Create and broadcast a new gig" />
      <Card>
        <CardHeader>
          <CardTitle>Opportunity form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Opportunity creation form will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
