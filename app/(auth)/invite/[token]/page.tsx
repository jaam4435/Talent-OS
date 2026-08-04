import { InviteAcceptForm } from '@/modules/core/components/auth/invite-accept-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/core/components/ui/card'

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
        <InviteAcceptForm token={token} />
      </CardContent>
    </Card>
  )
}
