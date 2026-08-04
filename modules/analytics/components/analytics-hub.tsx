import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { ANALYTICS_DASHBOARD_LINKS } from '@/modules/analytics/dashboard-links'

export function AnalyticsHub() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ANALYTICS_DASHBOARD_LINKS.map((dashboard) => (
        <Link key={dashboard.id} href={dashboard.href} className="group block">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                {dashboard.label}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardTitle>
              <CardDescription>{dashboard.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Open dashboard</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
