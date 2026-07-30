import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/modules/core/components/ui/button'
import { Badge } from '@/modules/core/components/ui/badge'
import { EmptyState, PageHeader } from '@/modules/core/components/shared/page-header'
import { createClient } from '@/modules/core/utils/supabase/server'
import { requireTenant } from '@/modules/core/services/session'
import { isManager } from '@/modules/core/services/permissions'

export const metadata = { title: 'Opportunities' }

export default async function OpportunitiesPage() {
  const { tenant } = await requireTenant()
  const supabase = await createClient()

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, title, status, budget, currency, client_name, response_deadline')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <PageHeader title="Opportunities" description="Broadcast and track open gigs">
        {isManager(tenant.role) ? (
          <Button asChild>
            <Link href="/opportunities/new">
              <Plus className="mr-2 h-4 w-4" />
              New opportunity
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {!opportunities?.length ? (
        <EmptyState
          title="No opportunities"
          description="Create an opportunity to start broadcasting gigs to your talent."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opp) => (
            <Link
              key={opp.id}
              href={`/opportunities/${opp.id}`}
              className="rounded-lg border p-5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{opp.title}</h3>
                <Badge variant="secondary" className="capitalize">
                  {opp.status}
                </Badge>
              </div>
              {opp.client_name ? (
                <p className="mt-2 text-sm text-muted-foreground">{opp.client_name}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
