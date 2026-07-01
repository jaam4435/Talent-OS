import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, PageHeader } from '@/components/shared/page-header'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth/session'
import { isManager } from '@/lib/auth/permissions'
import { formatCurrency } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Talent' }

export default async function TalentPage() {
  const { tenant } = await requireTenant()
  const supabase = await createClient()

  const { data: freelancers } = await supabase
    .from('freelancers')
    .select('id, full_name, email, discipline, day_rate, currency, availability, internal_rating')
    .eq('tenant_id', tenant.id)
    .order('full_name')
    .limit(50)

  return (
    <div>
      <PageHeader
        title="Talent"
        description="Manage your freelancer roster"
      >
        {isManager(tenant.role) ? (
          <Button asChild>
            <Link href="/talent/new">
              <Plus className="mr-2 h-4 w-4" />
              Add talent
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {!freelancers?.length ? (
        <EmptyState
          title="No freelancers yet"
          description="Add your first freelancer to start building your talent roster."
          action={
            isManager(tenant.role) ? (
              <Button asChild>
                <Link href="/talent/new">Add talent</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Discipline</th>
                <th className="p-4 font-medium">Rate</th>
                <th className="p-4 font-medium">Availability</th>
                <th className="p-4 font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {freelancers.map((f) => (
                <tr key={f.id} className="border-b last:border-0">
                  <td className="p-4">
                    <Link href={`/talent/${f.id}`} className="font-medium hover:underline">
                      {f.full_name}
                    </Link>
                    <p className="text-muted-foreground">{f.email}</p>
                  </td>
                  <td className="p-4 capitalize">{f.discipline}</td>
                  <td className="p-4">
                    {f.day_rate ? formatCurrency(Number(f.day_rate), f.currency) : '—'}
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className="capitalize">
                      {f.availability}
                    </Badge>
                  </td>
                  <td className="p-4">{f.internal_rating ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
