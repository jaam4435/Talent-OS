import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { formatCurrency } from '@/lib/utils/format'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return { title: `Talent ${id.slice(0, 8)}` }
}

export default async function TalentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenant } = await requireTenant()
  const supabase = await createClient()

  const { data: freelancer } = await supabase
    .from('freelancers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!freelancer) notFound()

  return (
    <div>
      <PageHeader title={freelancer.full_name} description={freelancer.email} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discipline</span>
              <span className="capitalize">{freelancer.discipline}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day rate</span>
              <span>
                {freelancer.day_rate
                  ? formatCurrency(Number(freelancer.day_rate), freelancer.currency)
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Availability</span>
              <Badge variant="secondary" className="capitalize">
                {freelancer.availability}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {freelancer.skills?.length ? (
              freelancer.skills.map((skill: string) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No skills listed</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
