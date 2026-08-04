import { BreadcrumbNav } from '@/modules/core/components/navigation/breadcrumb-nav'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-48 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted" />
      </div>
      <div className="h-24 rounded-lg border bg-muted/40" />
      <div className="rounded-lg border">
        <div className="border-b bg-muted/30 p-4">
          <div className="h-4 w-full rounded bg-muted" />
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="border-b p-4 last:border-0">
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Optional breadcrumb skeleton wrapper for nested routes. */
export function LoadingShell({ titleWidth = 'w-48' }: { titleWidth?: string }) {
  return (
    <>
      <BreadcrumbNav items={[{ label: 'Loading…' }]} />
      <div className={`mb-8 h-8 ${titleWidth} animate-pulse rounded bg-muted`} />
    </>
  )
}
