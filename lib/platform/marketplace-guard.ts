import { notFound } from 'next/navigation'
import { createAdminRepositories } from '@/lib/repositories/factory'
import { AppError } from '@/modules/core/api/response'
import { createFeatureFlagService } from '@/modules/platform/features/flags'
import { PLATFORM_FLAG_KEYS } from '@/modules/platform/features/registry'

export async function isMarketplaceEnabled(): Promise<boolean> {
  const repos = await createAdminRepositories()
  const flags = createFeatureFlagService({ featureRepo: repos.platformFeature })
  return flags.isEnabled(PLATFORM_FLAG_KEYS.MARKETPLACE_ENABLED)
}

/** API routes — returns 404 when marketplace is disabled (no feature leak). */
export async function assertMarketplaceEnabled(): Promise<void> {
  if (!(await isMarketplaceEnabled())) {
    throw new AppError('NOT_FOUND', 'Not found', 404)
  }
}

/** Server pages — Next.js 404 when marketplace is disabled. */
export async function requireMarketplaceEnabled(): Promise<void> {
  if (!(await isMarketplaceEnabled())) {
    notFound()
  }
}
