import { Suspense } from 'react'
import { getWhatsAppObservability, listWhatsAppConversations } from '@/lib/queries/whatsapp.queries'
import { WhatsAppConversationList } from '@/modules/whatsapp-platform/components/whatsapp-conversation-list'
import { Pagination } from '@/modules/core/components/shared/pagination'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'WhatsApp' }

export default async function WhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tenant } = await requireManager()
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))

  const [summary, conversations] = await Promise.all([
    getWhatsAppObservability(tenant.id),
    listWhatsAppConversations(tenant.id, { page, limit: 20 }),
  ])

  return (
    <div>
      <WhatsAppConversationList summary={summary} conversations={conversations.data} />
      <Suspense fallback={null}>
        <Pagination page={page} hasMore={conversations.hasMore} pathname="/whatsapp" />
      </Suspense>
    </div>
  )
}
