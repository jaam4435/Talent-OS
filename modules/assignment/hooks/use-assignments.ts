'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignmentApi } from '@/lib/api/assignment-api'
import { getUserMessageForApiError } from '@/lib/api/user-messages'

export function useAssignments() {
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
    api: assignmentApi,
  }
}
