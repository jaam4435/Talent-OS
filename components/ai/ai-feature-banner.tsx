import { getFeatureFlags } from '@/lib/ai/features/flags'

interface AiFeatureBannerProps {
  tenantId: string
}

export async function AiFeatureBanner({ tenantId }: AiFeatureBannerProps) {
  const flags = await getFeatureFlags(tenantId)

  if (flags.aiMatchingEnabled) return null

  return (
    <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <p className="font-medium text-amber-900 dark:text-amber-100">AI matching is disabled</p>
      <p className="mt-1 text-amber-800/80 dark:text-amber-100/80">
        Enable AI matching in agency settings to run talent match and agent workflows that depend on
        matching.
      </p>
    </div>
  )
}
