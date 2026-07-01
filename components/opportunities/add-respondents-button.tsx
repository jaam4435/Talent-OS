'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addRespondentsToShortlist } from '@/app/actions/shortlists'
import { Button } from '@/components/ui/button'

interface AddRespondentsButtonProps {
  opportunityId: string
  count: number
}

export function AddRespondentsButton({ opportunityId, count }: AddRespondentsButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await addRespondentsToShortlist(opportunityId)
      router.refresh()
    })
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleClick}>
      {isPending ? 'Adding...' : `Add ${count} interested response(s)`}
    </Button>
  )
}
