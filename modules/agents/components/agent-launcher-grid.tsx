'use client'

import Link from 'next/link'
import { Bot } from 'lucide-react'
import type { AgentConfigSummary } from '@/modules/agents/types'
import { Badge } from '@/modules/core/components/ui/badge'
import { Button } from '@/modules/core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/core/components/ui/card'

interface AgentLauncherGridProps {
  agents: AgentConfigSummary[]
}

export function AgentLauncherGrid({ agents }: AgentLauncherGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <Card key={agent.agentId}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{agent.label}</CardTitle>
              </div>
              <Badge variant={agent.enabled ? 'secondary' : 'outline'}>
                {agent.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{agent.description}</p>
            <Button asChild size="sm" disabled={!agent.enabled}>
              <Link href={`/ai/agents/${agent.agentId}`}>
                {agent.enabled ? 'Launch session' : 'Disabled'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
