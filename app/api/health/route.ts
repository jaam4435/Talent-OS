import { withApiHandler } from '@/modules/core/api/handler'

export const GET = withApiHandler({ auth: 'none', legacyEnvelope: true }, async () => {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  return {
    ok: true,
    service: 'talent-os',
    supabase: hasSupabase,
    timestamp: new Date().toISOString(),
  }
})
