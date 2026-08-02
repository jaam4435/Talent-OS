'use client'

import { useCallback, useState, useTransition } from 'react'
import { agentsApi } from '@/lib/api/agents-api'
import { getUserMessageForApiError } from '@/lib/api/user-messages'
import type { AgentConversationState, AgentRunResult } from '@/modules/agents/types'

export function useAgentSession(agentId: string) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [conversation, setConversation] = useState<AgentConversationState | null>(null)
  const [lastResult, setLastResult] = useState<AgentRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const refreshSession = useCallback(
    async (id: string) => {
      const state = await agentsApi.getSession(agentId, id)
      setConversation(state)
    },
    [agentId]
  )

  const startSession = useCallback(() => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await agentsApi.createSession(agentId)
        setSessionId(result.sessionId)
        await refreshSession(result.sessionId)
      } catch (err) {
        setError(getUserMessageForApiError(err))
      }
    })
  }, [agentId, refreshSession])

  const sendMessage = useCallback(
    (message: string) => {
      setError(null)
      startTransition(async () => {
        try {
          let activeSessionId = sessionId
          if (!activeSessionId) {
            const created = await agentsApi.createSession(agentId)
            activeSessionId = created.sessionId
            setSessionId(created.sessionId)
          }

          const result = await agentsApi.run(agentId, {
            message,
            sessionId: activeSessionId,
          })
          setLastResult(result)
          await refreshSession(result.sessionId)
        } catch (err) {
          setError(getUserMessageForApiError(err))
        }
      })
    },
    [agentId, refreshSession, sessionId]
  )

  return {
    sessionId,
    conversation,
    lastResult,
    error,
    isPending,
    startSession,
    sendMessage,
    clearError: () => setError(null),
    api: agentsApi,
  }
}
