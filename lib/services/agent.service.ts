import { randomUUID } from 'crypto'
import { hashPayload } from '@/lib/integrations/encryption'
import { globalPromptManager } from '@/lib/ai/prompt/manager'
import {
  checkAgentPermissions,
  computeExpiresAt,
  filterMemoryByPolicy,
  mergeAgentConfig,
  resolveAgentTools,
  toAgentConfigSummary,
  validateToolAllowlist,
  getAgentDefault,
  listAgentDefaults,
  isValidAgentId,
} from '@/lib/ai/agent'
import { isDomainError } from '@/modules/core/utils/errors'
import type { Repositories } from '@/lib/repositories/factory'
import type {
  AgentId,
  AgentRunContext,
  CreateAgentSessionInput,
  UpdateAgentConfigInput,
  WriteAgentMemoryInput,
} from '@/modules/agents/types'
import {
  createAgentSessionSchema,
  prepareAgentRunSchema,
  updateAgentConfigSchema,
  writeAgentMemorySchema,
} from '@/modules/agents/validation'
import type { UserRole } from '@/modules/core/types/enums'
import { getPermissionsForRole } from '@/modules/core/services/permissions'

export class AgentService {
  constructor(private readonly repos: Repositories) {}

  async getSession(sessionId: string, tenantId: string) {
    return this.repos.agentSession.findById(sessionId, tenantId)
  }

  async listAgents(tenantId: string) {
    const overrides = await this.repos.agentConfig.listByTenant(tenantId)
    const overrideMap = new Map(overrides.map((o) => [o.agent_id, o]))

    return listAgentDefaults().map((defaults) => {
      const config = mergeAgentConfig(defaults.agentId, overrideMap.get(defaults.agentId) ?? null)
      return toAgentConfigSummary(config)
    })
  }

  async getAgent(tenantId: string, agentId: AgentId) {
    if (!isValidAgentId(agentId)) return null
    const override = await this.repos.agentConfig.findByAgent(tenantId, agentId)
    return toAgentConfigSummary(mergeAgentConfig(agentId, override))
  }

  async updateAgentConfig(
    tenantId: string,
    agentId: AgentId,
    input: UpdateAgentConfigInput
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!isValidAgentId(agentId)) return { ok: false, error: 'Invalid agent' }

    const parsed = updateAgentConfigSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    if (parsed.data.allowedTools) {
      const defaults = getAgentDefault(agentId)
      const validation = validateToolAllowlist(parsed.data.allowedTools, defaults.allowedTools)
      if (!validation.ok) {
        return { ok: false, error: `Invalid tools: ${validation.invalid.join(', ')}` }
      }
    }

    try {
      await this.repos.agentConfig.upsert(tenantId, agentId, parsed.data)
      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Update failed' }
    }
  }

  async resetAgentConfig(
    tenantId: string,
    agentId: AgentId
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!isValidAgentId(agentId)) return { ok: false, error: 'Invalid agent' }

    try {
      await this.repos.agentConfig.resetToDefaults(tenantId, agentId)
      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Reset failed' }
    }
  }

  async createSession(
    tenantId: string,
    input: CreateAgentSessionInput
  ): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
    const parsed = createAgentSessionSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    const config = await this.getResolvedConfig(tenantId, parsed.data.agentId)
    if (!config.enabled) return { ok: false, error: 'Agent is disabled' }

    try {
      const sessionId = await this.repos.agentSession.create(tenantId, parsed.data)
      return { ok: true, sessionId }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Session create failed' }
    }
  }

  async writeMemory(
    tenantId: string,
    input: WriteAgentMemoryInput
  ): Promise<{ ok: true; memoryId: string } | { ok: false; error: string }> {
    const parsed = writeAgentMemorySchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    const config = await this.getResolvedConfig(tenantId, parsed.data.agentId)
    const ttlHours = parsed.data.ttlHours ?? config.memoryPolicy.ttlHours

    try {
      const memoryId = await this.repos.agentMemory.upsert({
        tenantId,
        agentId: parsed.data.agentId,
        sessionId: parsed.data.sessionId,
        scope: parsed.data.scope,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        memoryKey: parsed.data.memoryKey,
        content: parsed.data.content,
        metadata: parsed.data.metadata,
        expiresAt: computeExpiresAt(ttlHours),
      })
      return { ok: true, memoryId }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Memory write failed' }
    }
  }

  async clearMemory(
    tenantId: string,
    agentId: AgentId,
    options?: { sessionId?: string; entityType?: string; entityId?: string }
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await this.repos.agentMemory.deleteByScope({
        tenantId,
        agentId,
        sessionId: options?.sessionId,
        entityType: options?.entityType,
        entityId: options?.entityId,
      })
      return { ok: true }
    } catch (error) {
      if (isDomainError(error)) return { ok: false, error: error.message }
      return { ok: false, error: error instanceof Error ? error.message : 'Clear failed' }
    }
  }

  /**
   * Assemble run context: instructions (server-side), tools, memory, permissions.
   * Does not invoke LLM — execution layer comes in a future iteration.
   */
  async prepareRun(
    tenantId: string,
    userId: string,
    role: UserRole,
    input: {
      agentId: AgentId
      sessionId?: string
      entityType?: string
      entityId?: string
      correlationId?: string
    }
  ): Promise<{ ok: true; context: AgentRunContext } | { ok: false; error: string }> {
    const parsed = prepareAgentRunSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
    }

    const config = await this.getResolvedConfig(tenantId, parsed.data.agentId)
    if (!config.enabled) return { ok: false, error: 'Agent is disabled' }

    const userPermissions = getPermissionsForRole(role)
    const permCheck = checkAgentPermissions(config.requiredPermissions, userPermissions, role)
    if (!permCheck.ok) {
      return { ok: false, error: `Missing permissions: ${permCheck.missing.join(', ')}` }
    }

    let sessionId = parsed.data.sessionId
    if (!sessionId) {
      const created = await this.createSession(tenantId, {
        agentId: parsed.data.agentId,
        userId,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        correlationId: parsed.data.correlationId,
      })
      if (!created.ok) return created
      sessionId = created.sessionId
    }

    const instructions = await this.resolveInstructions(tenantId, config)
    const tools = resolveAgentTools(config.allowedTools, userPermissions, role)
    const allMemory = await this.repos.agentMemory.list({
      tenantId,
      agentId: parsed.data.agentId,
      sessionId,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
    })
    const memory = filterMemoryByPolicy(
      allMemory,
      config.memoryPolicy,
      sessionId,
      parsed.data.entityType,
      parsed.data.entityId
    )

    return {
      ok: true,
      context: {
        agentId: parsed.data.agentId,
        sessionId,
        instructions,
        tools,
        memory,
        permissions: userPermissions.filter((p) =>
          config.requiredPermissions.includes(p) || tools.some((t) => t.requiredPermission === p)
        ),
        correlationId: parsed.data.correlationId ?? randomUUID(),
      },
    }
  }

  private async getResolvedConfig(tenantId: string, agentId: AgentId) {
    const override = await this.repos.agentConfig.findByAgent(tenantId, agentId)
    return mergeAgentConfig(agentId, override)
  }

  /** Resolve instructions server-side — never returned to UI layers. */
  private async resolveInstructions(
    tenantId: string,
    config: Awaited<ReturnType<typeof mergeAgentConfig>>
  ) {
    const dbInstruction = await this.repos.agentInstruction.getActiveInstruction(
      config.agentId,
      tenantId
    )

    if (dbInstruction) {
      return {
        promptId: dbInstruction.promptId,
        version: dbInstruction.version,
        promptHash: hashPayload({
          promptId: dbInstruction.promptId,
          version: dbInstruction.version,
          content: dbInstruction.content,
        }),
      }
    }

    const resolved = globalPromptManager.resolve(
      config.instructionPromptId,
      config.instructionVersion ?? undefined
    )

    return {
      promptId: resolved.id,
      version: resolved.version,
      promptHash: resolved.promptHash,
    }
  }
}
