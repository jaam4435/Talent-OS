import { notFound } from 'next/navigation'
import { getWhatsAppConversationDetail } from '@/lib/queries/whatsapp.queries'
import { WhatsAppConversationDetail } from '@/modules/whatsapp-platform/components/whatsapp-conversation-detail'
import { requireManager } from '@/modules/core/services/guards'

export const metadata = { title: 'WhatsApp · Conversation' }

export default async function WhatsAppConversationPage({
  params,
}: {
  params: Promise<{ freelancerId: string }>
}) {
  const { tenant } = await requireManager()
  const { freelancerId } = await params
  const detail = await getWhatsAppConversationDetail(tenant.id, freelancerId)
  if (!detail) notFound()

  return (
    <WhatsAppConversationDetail
      conversation={detail.conversation}
      memory={detail.memory}
      audit={detail.audit}
    />
  )
}
