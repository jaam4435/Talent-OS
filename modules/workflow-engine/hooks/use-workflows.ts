'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { workflowApi } from '@/lib/api/workflow-api'
import { getUserMessageForApiError } from '@/lib/api/user-messages'

export function useWorkflows() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const run = useCallback(
    (action: () => Promise<void>) => {
      setError(null)
      startTransition(async () => {
        try {
          await action()
          router.refresh()
        } catch (err) {
          setError(getUserMessageForApiError(err))
        }
      })
    },
    [router]
  )

  return {
    error,
    isPending,
    clearError: () => setError(null),
    run,
    api: workflowApi,
  }
}
