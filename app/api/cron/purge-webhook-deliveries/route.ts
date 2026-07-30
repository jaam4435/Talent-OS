import { NextResponse } from 'next/server'
import { validateSystemAuth } from '@/lib/integrations/system-auth'
import { createAdminServices } from '@/lib/services/factory'

export async function GET(request: Request) {
  const auth = validateSystemAuth(request.headers.get('authorization'), 'cron')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const services = await createAdminServices()
  const purged = await services.integration.purgeWebhookDeliveries(72)

  return NextResponse.json({ purged, retention_hours: 72 })
}
