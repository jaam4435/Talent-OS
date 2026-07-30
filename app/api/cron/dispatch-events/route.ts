import { NextResponse } from 'next/server'
import { validateSystemAuth } from '@/lib/integrations/system-auth'
import { createAdminServices } from '@/lib/services/factory'
import { runEventDispatchWorker } from '@/lib/events/workers/dispatch-worker'

export async function GET(request: Request) {
  const auth = validateSystemAuth(request.headers.get('authorization'), 'cron')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? 50)

  const services = await createAdminServices()
  const result = await runEventDispatchWorker(services, limit)

  return NextResponse.json(result)
}
