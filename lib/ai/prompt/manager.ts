import { hashPayload } from '@/lib/integrations/encryption'
import type { PromptDefinition, ResolvedPrompt } from '@/lib/ai/types'

export class PromptManager {
  private readonly prompts = new Map<string, Map<string, PromptDefinition>>()
  private readonly activeVersions = new Map<string, string>()

  register(definition: PromptDefinition): void {
    const versions = this.prompts.get(definition.id) ?? new Map()
    versions.set(definition.version, definition)
    this.prompts.set(definition.id, versions)

    if (definition.active !== false && !this.activeVersions.has(definition.id)) {
      this.activeVersions.set(definition.id, definition.version)
    }
  }

  setActiveVersion(promptId: string, version: string): void {
    const versions = this.prompts.get(promptId)
    if (!versions?.has(version)) {
      throw new Error(`Prompt ${promptId}@${version} is not registered`)
    }
    this.activeVersions.set(promptId, version)
  }

  resolve(promptId: string, version?: string): ResolvedPrompt {
    const resolvedVersion = version ?? this.activeVersions.get(promptId)
    if (!resolvedVersion) {
      throw new Error(`No active version for prompt: ${promptId}`)
    }

    const definition = this.prompts.get(promptId)?.get(resolvedVersion)
    if (!definition) {
      throw new Error(`Prompt not found: ${promptId}@${resolvedVersion}`)
    }

    return {
      id: definition.id,
      version: definition.version,
      system: definition.system,
      promptHash: hashPayload({ id: definition.id, version: definition.version, system: definition.system }),
    }
  }

  build(promptId: string, userContent: unknown, version?: string): {
    system: string
    user: string
    promptHash: string
    promptId: string
    promptVersion: string
  } {
    const resolved = this.resolve(promptId, version)
    const user = typeof userContent === 'string' ? userContent : JSON.stringify(userContent, null, 2)
    const promptHash = hashPayload({ system: resolved.system, user: userContent, version: resolved.version })

    return {
      system: resolved.system,
      user,
      promptHash,
      promptId: resolved.id,
      promptVersion: resolved.version,
    }
  }

  listVersions(promptId: string): string[] {
    return [...(this.prompts.get(promptId)?.keys() ?? [])]
  }
}

export const globalPromptManager = new PromptManager()

export function registerDefaultPrompts(): void {
  globalPromptManager.register({
    id: 'talent_match',
    version: '1.0.0',
    system: `You are a talent matching engine for creative agencies.
Rank freelancers against an opportunity based on skill fit, discipline alignment, availability, internal rating, and budget fit.
Return only valid JSON matching the schema. Scores must be 0-100.
Prefer candidates with overlapping required skills and matching discipline.
Penalize unavailable or busy freelancers.`,
    active: true,
  })

  globalPromptManager.register({
    id: 'brief_parse',
    version: '1.0.0',
    system: `You are an AI project manager for creative agencies.
Extract structured requirements from client briefs.
Return only valid JSON matching the schema.
Infer practical deliverables and milestone suggestions when not explicitly stated.`,
    active: true,
  })

  globalPromptManager.register({
    id: 'project_summary',
    version: '1.0.0',
    system: `You are an AI project manager summarizing project health for agency staff.
Be concise, actionable, and factual based only on provided data.
Highlight blockers and recommended next steps.`,
    active: true,
  })

  globalPromptManager.register({
    id: 'status_assessment',
    version: '1.0.0',
    system: `You are an AI project manager assessing delivery risk.
Classify project health as on_track, at_risk, or blocked.
Suggest a project status only when clearly warranted; otherwise return null for suggested_status.
Never invent facts not present in the input.`,
    active: true,
  })

  globalPromptManager.register({
    id: 'shortlist_summary',
    version: '1.0.0',
    system: `You are an AI project manager comparing shortlisted freelancers for a creative opportunity.
Summarize trade-offs and recommend the best fit based on scores, rates, ratings, and responses.`,
    active: true,
  })
}
