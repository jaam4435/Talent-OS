import { TalentOsApiError } from '@/lib/api/client'
import type { ApiErrorBody, ApiResponse, ApiSuccess } from '@/modules/core/types/api'
import type { AgentConfigSummary, AgentConversationState, AgentRunResult } from '@/modules/agents/types'

async function agentsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': 'v1',
      ...(init?.headers ?? {}),
    },
  })

  const json = (await response.json()) as ApiResponse<T> | ApiErrorBody
  if (!response.ok || 'error' in json) {
    const err = json as ApiErrorBody
    throw new TalentOsApiError(
      err.error?.code ?? 'INTERNAL_ERROR',
      err.error?.message ?? 'Request failed',
      response.status,
      err.error?.details
    )
  }

  return (json as ApiSuccess<T>).data
}

export const agentsApi = {
  listAgents() {
    return agentsRequest<AgentConfigSummary[]>('/api/agents')
  },

  getAgentConfig(agentId: string) {
    return agentsRequest<AgentConfigSummary>(`/api/agents/${agentId}/config`)
  },

  updateAgentConfig(agentId: string, body: Record<string, unknown>) {
    return agentsRequest<AgentConfigSummary>(`/api/agents/${agentId}/config`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  createSession(agentId: string, body?: Record<string, unknown>) {
    return agentsRequest<{ sessionId: string }>(`/api/agents/${agentId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    })
  },

  getSession(agentId: string, sessionId: string) {
    return agentsRequest<AgentConversationState>(`/api/agents/${agentId}/sessions/${sessionId}`)
  },

  run(agentId: string, body: { message: string; sessionId?: string }) {
    return agentsRequest<AgentRunResult>(`/api/agents/${agentId}/run`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}
