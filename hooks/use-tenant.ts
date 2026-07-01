'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TenantContext } from '@/types/enums'

export function useTenant() {
  const [tenant, setTenant] = useState<TenantContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/auth/session')
      const json = await res.json()
      setTenant(json.data?.tenant ?? null)
      setLoading(false)
    }
    load()
  }, [])

  return { tenant, loading }
}

export function useRealtime<T extends Record<string, unknown>>(
  table: string,
  filter: string,
  callback: (payload: T) => void
) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        (payload) => callback(payload.new as T)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, callback])
}
