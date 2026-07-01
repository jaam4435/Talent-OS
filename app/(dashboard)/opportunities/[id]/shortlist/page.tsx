import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ShortlistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div>
      <PageHeader title="Shortlist" description={`Candidates for opportunity ${id}`} />
      <Card>
        <CardHeader>
          <CardTitle>Shortlist board</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Drag-and-drop shortlist UI will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
