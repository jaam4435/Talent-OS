import { requireMarketplaceEnabled } from '@/lib/platform/marketplace-guard'

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  await requireMarketplaceEnabled()
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Talent OS</p>
            <h1 className="text-xl font-semibold">Talent Marketplace</h1>
          </div>
          <p className="text-sm text-muted-foreground">Read-only discovery</p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
