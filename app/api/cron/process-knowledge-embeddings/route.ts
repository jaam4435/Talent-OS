import { NextResponse } from 'next/server'
import { validateSystemAuth } from '@/lib/integrations/system-auth'
import { createAdminServices } from '@/lib/services/factory'
import { runKnowledgeEmbeddingWorker } from '@/lib/knowledge/embedding-worker'

export async function GET(request: Request) {
  const auth = validateSystemAuth(request.headers.get('authorization'), 'cron')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? 20)

  const services = await createAdminServices()
  const result = await runKnowledgeEmbeddingWorker(services, limit)

  return NextResponse.json(result)
}
