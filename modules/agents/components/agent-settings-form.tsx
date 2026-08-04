'use client'

import { useEffect, useState, useTransition } from 'react'
import type { AgentConfigSummary } from '@/modules/agents/types'
import { agentsApi } from '@/lib/api/agents-api'
import { getUserMessageForApiError } from '@/lib/api/user-messages'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { Label } from '@/modules/core/components/ui/label'

interface AgentSettingsFormProps {
  agents: AgentConfigSummary[]
}

export function AgentSettingsForm({ agents: initialAgents }: AgentSettingsFormProps) {
  const [agents, setAgents] = useState(initialAgents)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setAgents(initialAgents)
  }, [initialAgents])

  function toggleAgent(agent: AgentConfigSummary) {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const updated = await agentsApi.updateAgentConfig(agent.agentId, {
          enabled: !agent.enabled,
        })
        setAgents((current) =>
          current.map((row) => (row.agentId === updated.agentId ? updated : row))
        )
        setMessage(`${updated.label} ${updated.enabled ? 'enabled' : 'disabled'}`)
      } catch (err) {
        setError(getUserMessageForApiError(err))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.agentId} className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div>
                <Label>{agent.label}</Label>
                <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tools: {agent.allowedTools.slice(0, 4).join(', ')}
                  {agent.allowedTools.length > 4 ? '…' : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant={agent.enabled ? 'default' : 'outline'}
                disabled={isPending}
                onClick={() => toggleAgent(agent)}
              >
                {agent.enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
