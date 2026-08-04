'use client'

import { useEffect } from 'react'
import { PageError } from '@/modules/core/components/shared/page-error'
import { getUserMessageForApiError } from '@/lib/api/user-messages'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard-error]', error)
  }, [error])

  return (
    <PageError
      title="Unable to load page"
      message={getUserMessageForApiError(error)}
      onRetry={reset}
    />
  )
}
