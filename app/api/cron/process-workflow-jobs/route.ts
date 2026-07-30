import { NextResponse } from 'next/server'
import { validateSystemAuth } from '@/lib/integrations/system-auth'
import { createAdminServices } from '@/lib/services/factory'

export async function GET(request: Request) {
  const auth = validateSystemAuth(request.headers.get('authorization'), 'cron')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const queue = searchParams.get('queue') ?? undefined
  const limit = Number(searchParams.get('limit') ?? 50)

  const services = await createAdminServices()
  const result = await services.workflowEngine.processJobQueue(limit, queue ?? undefined)

  return NextResponse.json(result)
}
