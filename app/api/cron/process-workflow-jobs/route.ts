import { NextResponse } from 'next/server'
import { createAdminServices } from '@/lib/services/factory'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const queue = searchParams.get('queue') ?? undefined
  const limit = Number(searchParams.get('limit') ?? 50)

  const services = await createAdminServices()
  const result = await services.workflowEngine.processJobQueue(limit, queue ?? undefined)

  return NextResponse.json(result)
}
