import type { AiMessage } from '@/lib/ai/types'
import type { AgentReasoningPolicy, AgentRunContext, AgentToolCallRecord } from '@/modules/agents/types'
import type { ResolvedAgentTool } from '@/lib/ai/agent/tool-filter'
import type { AiGateway } from '@/lib/ai/gateway'
import type { McpGatewayInterface, McpServerId } from '@/lib/mcp/types'
import type { UserRole } from '@/modules/core/types/enums'
import { createMcpExecutionContext } from '@/lib/mcp/gateway'

export interface ReasoningStepResult {
  type: 'final' | 'tool_call'
  content?: string
  tool?: string
  arguments?: Record<string, unknown>
}

export interface ReasoningLoopResult {
  content: string
  steps: number
  toolCalls: AgentToolCallRecord[]
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

const REASONING_RESPONSE_SCHEMA = {
  name: 'agent_reasoning_step',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['final', 'tool_call'] },
      content: { type: 'string', description: 'Final answer when type is final' },
      tool: { type: 'string', description: 'Tool name when type is tool_call' },
      arguments: {
        type: 'object',
        description: 'Tool arguments when type is tool_call',
        additionalProperties: true,
      },
    },
    required: ['type'],
    additionalProperties: false,
  },
}

function buildToolCatalogPrompt(tools: ResolvedAgentTool[]): string {
  if (tools.length === 0) return 'No tools available.'

  return tools
    .map(
      (t) =>
        `- ${t.name} (${t.title}): ${t.description}${t.destructive ? ' [DESTRUCTIVE — requires confirmation]' : ''}`
    )
    .join('\n')
}

function buildMemoryPrompt(memory: AgentRunContext['memory']): string {
  if (memory.length === 0) return ''

  const entries = memory
    .slice(0, 20)
    .map((m) => `[${m.scope}/${m.memory_key}]: ${m.content}`)
    .join('\n')

  return `\n\nRelevant memory:\n${entries}`
}

function toAiMessages(
  systemPrompt: string,
  tools: ResolvedAgentTool[],
  history: AiMessage[],
  userMessage: string,
  memory: AgentRunContext['memory']
): AiMessage[] {
  const toolCatalog = buildToolCatalogPrompt(tools)
  const memoryBlock = buildMemoryPrompt(memory)

  const system = `${systemPrompt}${memoryBlock}

Available tools:
${toolCatalog}

Respond with JSON only:
- To answer: { "type": "final", "content": "your response" }
- To use a tool: { "type": "tool_call", "tool": "tool_name", "arguments": { ... } }
Use tools when you need data. Do not invent tool results.`

  return [{ role: 'system', content: system }, ...history, { role: 'user', content: userMessage }]
}

function parseReasoningStep(raw: unknown): ReasoningStepResult {
  const step = raw as ReasoningStepResult
  if (step.type === 'final') {
    return { type: 'final', content: step.content ?? '' }
  }
  if (step.type === 'tool_call' && step.tool) {
    return {
      type: 'tool_call',
      tool: step.tool,
      arguments: (step.arguments as Record<string, unknown>) ?? {},
    }
  }
  return { type: 'final', content: JSON.stringify(raw) }
}

export class AgentReasoningEngine {
  constructor(
    private readonly aiGateway: AiGateway,
    private readonly mcpGateway: McpGatewayInterface
  ) {}

  async run(params: {
    context: AgentRunContext
    userMessage: string
    history: AiMessage[]
    tenantId: string
    userId: string
    role: UserRole
    policy: AgentReasoningPolicy
  }): Promise<ReasoningLoopResult> {
    const { context, userMessage, history, tenantId, userId, role, policy } = params
    const toolCalls: AgentToolCallRecord[] = []
    const workingHistory = [...history]
    let steps = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let currentUserMessage = userMessage

    const toolMap = new Map(context.tools.map((t) => [t.name, t]))

    while (steps < policy.maxSteps) {
      steps++

      const messages = toAiMessages(
        context.instructions.system,
        context.tools,
        workingHistory,
        currentUserMessage,
        context.memory
      )

      let step: ReasoningStepResult

      if (this.aiGateway.isConfigured()) {
        try {
          const response = await this.aiGateway.completeStructured({
            messages,
            model: context.modelOverride ?? undefined,
            temperature: policy.temperature,
            maxTokens: policy.maxTokens,
            tenantId,
            correlationId: context.correlationId,
            entityType: undefined,
            entityId: undefined,
            promptId: context.instructions.promptId,
            promptVersion: context.instructions.version,
            schema: REASONING_RESPONSE_SCHEMA,
          })

          totalInputTokens += response.usage.inputTokens
          totalOutputTokens += response.usage.outputTokens
          step = parseReasoningStep(response.data)
        } catch {
          const fallback = await this.aiGateway.complete({
            messages,
            model: context.modelOverride ?? undefined,
            temperature: policy.temperature,
            maxTokens: policy.maxTokens,
            tenantId,
            correlationId: context.correlationId,
            promptId: context.instructions.promptId,
            promptVersion: context.instructions.version,
          })

          totalInputTokens += fallback.usage.inputTokens
          totalOutputTokens += fallback.usage.outputTokens

          try {
            step = parseReasoningStep(JSON.parse(fallback.content))
          } catch {
            step = { type: 'final', content: fallback.content }
          }
        }
      } else {
        step = {
          type: 'final',
          content: `Agent framework ready. AI provider not configured. Message received: ${userMessage}`,
        }
      }

      if (step.type === 'final' || !policy.toolUseEnabled) {
        return {
          content: step.content ?? '',
          steps,
          toolCalls,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
          },
        }
      }

      const toolDef = toolMap.get(step.tool!)
      if (!toolDef) {
        workingHistory.push(
          { role: 'assistant', content: JSON.stringify(step) },
          { role: 'user', content: `Tool "${step.tool}" is not allowed for this agent.` }
        )
        currentUserMessage = 'Continue with available tools or provide a final answer.'
        continue
      }

      const mcpContext = createMcpExecutionContext({
        tenantId,
        userId,
        role,
        permissions: context.permissions,
        correlationId: context.correlationId,
      })

      const toolResult = await this.mcpGateway.invoke({
        serverId: toolDef.serverId as McpServerId,
        toolName: step.tool!,
        input: step.arguments ?? {},
        context: mcpContext,
      })

      toolCalls.push({
        tool: step.tool!,
        serverId: toolDef.serverId,
        arguments: step.arguments ?? {},
        result: toolResult.content,
        isError: toolResult.isError ?? false,
      })

      workingHistory.push(
        { role: 'assistant', content: JSON.stringify(step) },
        {
          role: 'user',
          content: `Tool result for ${step.tool}:\n${JSON.stringify(toolResult.content, null, 2)}`,
        }
      )
      currentUserMessage = 'Continue reasoning with the tool result or provide a final answer.'
    }

    return {
      content: 'Reached maximum reasoning steps. Please refine your request.',
      steps,
      toolCalls,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
      },
    }
  }
}
