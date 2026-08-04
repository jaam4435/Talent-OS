import { redirect } from 'next/navigation'
import { Header } from '@/modules/core/components/layout/header'
import { Sidebar } from '@/modules/core/components/layout/sidebar'
import { getSession } from '@/modules/core/services/session'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (!session.tenant) {
    redirect('/signup')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.tenant.role} tenantName={session.tenant.name} />
      <div className="flex flex-1 flex-col">
        <Header session={session} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
