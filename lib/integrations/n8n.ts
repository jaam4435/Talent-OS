import { createAdminClient } from '@/modules/core/utils/supabase/admin'
import { signPayload } from '@/lib/integrations/encryption'

export interface N8nEventEnvelope {
  event: string
  tenant_id: string
  correlation_id: string
  idempotency_key: string
  timestamp: string
  actor_id?: string | null
  data: Record<string, unknown>
}

export interface N8nIntegrationConfig {
  webhook_base_url: string
  webhook_secret: string
  is_active?: boolean
}

export async function getN8nConfig(tenantId: string): Promise<N8nIntegrationConfig | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('integration_configs')
    .select('config, is_active')
    .eq('tenant_id', tenantId)
    .eq('provider', 'n8n')
    .eq('is_active', true)
    .maybeSingle()

  if (!data?.config) return null

  const config = data.config as Record<string, unknown>
  if (!config.webhook_base_url || !config.webhook_secret) return null

  return {
    webhook_base_url: String(config.webhook_base_url).replace(/\/$/, ''),
    webhook_secret: String(config.webhook_secret),
    is_active: data.is_active,
  }
}

export function buildN8nEnvelope(input: {
  event: string
  tenantId: string
  data: Record<string, unknown>
  idempotencyKey: string
  correlationId?: string
  actorId?: string | null
}): N8nEventEnvelope {
  return {
    event: input.event,
    tenant_id: input.tenantId,
    correlation_id: input.correlationId ?? crypto.randomUUID(),
    idempotency_key: input.idempotencyKey,
    timestamp: new Date().toISOString(),
    actor_id: input.actorId ?? null,
    data: input.data,
  }
}

export async function dispatchToN8n(
  envelope: N8nEventEnvelope,
  config?: N8nIntegrationConfig | null
): Promise<{ ok: boolean; status: number; error?: string }> {
  const n8nConfig = config ?? (await getN8nConfig(envelope.tenant_id))
  const fallbackBase = process.env.N8N_WEBHOOK_BASE_URL
  const fallbackSecret = process.env.N8N_WEBHOOK_SECRET

  const baseUrl = n8nConfig?.webhook_base_url ?? fallbackBase
  const secret = n8nConfig?.webhook_secret ?? fallbackSecret

  if (!baseUrl || !secret) {
    return { ok: false, status: 0, error: 'n8n not configured' }
  }

  const url = `${baseUrl}/${envelope.event}`
  const signature = signPayload(envelope, secret)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': `sha256=${signature}`,
      'X-Correlation-ID': envelope.correlation_id,
      'X-Idempotency-Key': envelope.idempotency_key,
      'X-Tenant-ID': envelope.tenant_id,
    },
    body: JSON.stringify(envelope),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error')
    return { ok: false, status: response.status, error: text }
  }

  return { ok: true, status: response.status }
}
