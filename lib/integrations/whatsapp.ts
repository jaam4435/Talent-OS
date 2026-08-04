/**
 * @deprecated Import from `@/lib/whatsapp` instead. Thin re-exports for backward compatibility.
 */
export {
  parseMetaWebhook,
  normalizeMessageBody,
} from '@/lib/whatsapp/parser'
export { normalizePhone } from '@/lib/whatsapp/phone'
export type { ParsedWhatsAppMessage as InboundWhatsAppMessage } from '@/lib/whatsapp/types'

/** @deprecated Use CRMService.respondToPendingOpportunity via WhatsAppService */
export { parseQuickResponse } from '@/lib/whatsapp/intents-legacy'

export async function resolveTenantByPhoneNumberId(phoneNumberId: string) {
  const { createAdminServices } = await import('@/lib/services/factory')
  const services = await createAdminServices()
  return services.whatsapp.resolveTenantByPhoneNumberId(phoneNumberId)
}

export async function findFreelancerByPhone(tenantId: string, phone: string) {
  const { createAdminServices } = await import('@/lib/services/factory')
  const services = await createAdminServices()
  return services.talent.findByPhone(tenantId, phone)
}

export async function updateDeliveryStatus(waMessageId: string, status: string) {
  const { createAdminServices } = await import('@/lib/services/factory')
  const services = await createAdminServices()
  await services.whatsapp.updateDeliveryStatus(waMessageId, status)
}
