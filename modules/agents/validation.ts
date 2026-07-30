import { z } from 'zod'
import { AGENT_IDS } from '@/modules/agents/types'

const memoryPolicySchema = z.object({
  scope: z.enum(['session', 'entity', 'tenant']),
  entityTypes: z.array(z.string()).optional(),
  maxEntries: z.number().int().min(1).max(500),
  ttlHours: z.number().int().positive().optional(),
})

const reasoningPolicySchema = z.object({
  maxSteps: z.number().int().min(1).max(20),
  toolUseEnabled: z.boolean(),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(256).max(32_000),
})

const conversationPolicySchema = z.object({
  maxHistoryMessages: z.number().int().min(1).max(200),
  persistToolResults: z.boolean(),
  autoSummarize: z.boolean(),
})

export const updateAgentConfigSchema = z.object({
  enabled: z.boolean().optional(),
  allowedTools: z.array(z.string().min(1)).max(100).optional(),
  requiredPermissions: z.array(z.string().min(1)).max(50).optional(),
  memoryPolicy: memoryPolicySchema.partial().optional(),
  reasoningPolicy: reasoningPolicySchema.partial().optional(),
  conversationPolicy: conversationPolicySchema.partial().optional(),
  modelOverride: z.string().max(100).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const createAgentSessionSchema = z.object({
  agentId: z.enum(AGENT_IDS),
  userId: z.string().uuid().nullable().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  correlationId: z.string().max(100).optional(),
  context: z.record(z.unknown()).optional(),
})

export const writeAgentMemorySchema = z.object({
  agentId: z.enum(AGENT_IDS),
  sessionId: z.string().uuid().optional(),
  scope: z.enum(['session', 'entity', 'tenant']),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  memoryKey: z.string().min(1).max(200),
  content: z.string().min(1).max(50_000),
  metadata: z.record(z.unknown()).optional(),
  ttlHours: z.number().int().positive().optional(),
})

export const prepareAgentRunSchema = z.object({
  agentId: z.enum(AGENT_IDS),
  sessionId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  correlationId: z.string().max(100).optional(),
})

export const runAgentSchema = z.object({
  agentId: z.enum(AGENT_IDS),
  message: z.string().min(1).max(20_000),
  sessionId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  correlationId: z.string().max(100).optional(),
})

export const publishAgentInstructionSchema = z.object({
  agentId: z.enum(AGENT_IDS),
  promptId: z.string().min(1).max(200),
  version: z.string().min(1).max(50),
  content: z.string().min(1).max(100_000),
})
