import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Accept invitation' }

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept invitation</CardTitle>
        <CardDescription>Join your agency workspace on TalentOS</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Invite token: <code className="rounded bg-muted px-1">{token}</code>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Invitation acceptance flow will be implemented here.
        </p>
      </CardContent>
    </Card>
  )
}
