import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Add talent' }

export default function NewTalentPage() {
  return (
    <div>
      <PageHeader title="Add talent" description="Create a new freelancer profile" />
      <Card>
        <CardHeader>
          <CardTitle>Talent form</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Freelancer creation form will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
