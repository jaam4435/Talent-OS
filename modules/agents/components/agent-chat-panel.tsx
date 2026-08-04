'use client'

import { useState } from 'react'
import { useAgentSession } from '@/modules/agents/hooks/use-agent-session'
import { Button } from '@/modules/core/components/ui/button'
import { Input } from '@/modules/core/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'
import { formatDateTime } from '@/modules/core/utils/format'

interface AgentChatPanelProps {
  agentId: string
  agentLabel: string
}

export function AgentChatPanel({ agentId, agentLabel }: AgentChatPanelProps) {
  const { conversation, error, isPending, sendMessage, startSession } = useAgentSession(agentId)
  const [message, setMessage] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    sendMessage(trimmed)
    setMessage('')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{agentLabel}</CardTitle>
        <Button size="sm" variant="outline" disabled={isPending} onClick={startSession}>
          New session
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border p-4">
          {!conversation?.messages.length ? (
            <p className="text-sm text-muted-foreground">
              Start a session and send a message to run this agent.
            </p>
          ) : (
            conversation.messages.map((entry) => (
              <div key={entry.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium capitalize">{entry.role}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{entry.content}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask the agent…"
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending || !message.trim()}>
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
