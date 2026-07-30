import type { AgentDefaultDefinition, AgentId } from '@/modules/agents/types'

export const AGENT_DEFAULTS: Record<AgentId, AgentDefaultDefinition> = {
  recruiter: {
    agentId: 'recruiter',
    label: 'Recruiter Agent',
    description: 'Sources talent, manages shortlists, and matches freelancers to opportunities.',
    instructionPromptId: 'agent.recruiter',
    instructionVersion: '1.0.0',
    allowedTools: [
      'talent_search',
      'talent_get_profile',
      'talent_list_portfolio',
      'talent_get_rating_history',
      'crm_list_companies',
      'crm_get_company',
      'crm_search_companies',
      'ai_match_talent',
      'ai_shortlist_summary',
      'ai_parse_brief',
      'knowledge_get_entity_context',
      'knowledge_search',
      'knowledge_list_related_records',
    ],
    requiredPermissions: ['agent:run', 'freelancers:read', 'ai:match'],
    memoryPolicy: { scope: 'entity', entityTypes: ['opportunity', 'freelancer'], maxEntries: 100, ttlHours: 336 },
  },
  project_manager: {
    agentId: 'project_manager',
    label: 'Project Manager Agent',
    description: 'Tracks project health, milestones, workflows, and delivery status.',
    instructionPromptId: 'agent.project_manager',
    instructionVersion: '1.0.0',
    allowedTools: [
      'projects_list',
      'projects_get',
      'projects_update_status',
      'projects_list_milestones',
      'projects_review_milestone',
      'workflow_list_events',
      'workflow_get_event_status',
      'ai_project_summary',
      'ai_status_assessment',
      'notification_send',
      'notification_list',
      'knowledge_get_entity_context',
      'knowledge_search',
    ],
    requiredPermissions: ['agent:run', 'projects:read', 'ai:summary', 'ai:status'],
    memoryPolicy: { scope: 'entity', entityTypes: ['project', 'milestone'], maxEntries: 100, ttlHours: 336 },
  },
  finance: {
    agentId: 'finance',
    label: 'Finance Agent',
    description: 'Monitors payments, approvals, aging, and financial operations.',
    instructionPromptId: 'agent.finance',
    instructionVersion: '1.0.0',
    allowedTools: [
      'finance_list_payments',
      'finance_get_payment',
      'finance_payment_aging',
      'finance_export_payments',
      'projects_get',
      'projects_list_milestones',
      'knowledge_get_entity_context',
      'analytics_payment_aging',
    ],
    requiredPermissions: ['agent:run', 'payments:read'],
    memoryPolicy: { scope: 'entity', entityTypes: ['project', 'payment'], maxEntries: 50, ttlHours: 168 },
  },
  qa: {
    agentId: 'qa',
    label: 'QA Agent',
    description: 'Reviews deliverables, milestones, and quality against requirements.',
    instructionPromptId: 'agent.qa',
    instructionVersion: '1.0.0',
    allowedTools: [
      'projects_list',
      'projects_get',
      'projects_list_milestones',
      'projects_review_milestone',
      'storage_get_signed_url',
      'storage_list_files',
      'knowledge_search',
      'knowledge_get_entity_context',
      'knowledge_list_related_records',
    ],
    requiredPermissions: ['agent:run', 'projects:read', 'milestones:review'],
    memoryPolicy: { scope: 'entity', entityTypes: ['project', 'milestone'], maxEntries: 75, ttlHours: 168 },
  },
  executive: {
    agentId: 'executive',
    label: 'Executive Agent',
    description: 'Provides high-level analytics, pipeline health, and strategic insights.',
    instructionPromptId: 'agent.executive',
    instructionVersion: '1.0.0',
    allowedTools: [
      'analytics_dashboard_summary',
      'analytics_fill_rate',
      'analytics_talent_utilization',
      'analytics_payment_aging',
      'analytics_pipeline_health',
      'analytics_ai_usage',
      'knowledge_get_entity_context',
      'knowledge_search',
      'knowledge_get_tenant_policies',
    ],
    requiredPermissions: ['agent:run', 'analytics:read'],
    memoryPolicy: { scope: 'tenant', maxEntries: 25, ttlHours: 720 },
  },
  knowledge: {
    agentId: 'knowledge',
    label: 'Knowledge Agent',
    description: 'Searches and assembles context from the tenant knowledge base.',
    instructionPromptId: 'agent.knowledge',
    instructionVersion: '1.0.0',
    allowedTools: [
      'knowledge_search',
      'knowledge_get_entity_context',
      'knowledge_list_related_records',
      'knowledge_get_tenant_policies',
      'knowledge_get_schema_reference',
      'storage_get_signed_url',
      'storage_list_files',
    ],
    requiredPermissions: ['agent:run', 'tenant:read'],
    memoryPolicy: { scope: 'tenant', maxEntries: 200, ttlHours: 720 },
  },
}

export function getAgentDefault(agentId: AgentId): AgentDefaultDefinition {
  return AGENT_DEFAULTS[agentId]
}

export function listAgentDefaults(): AgentDefaultDefinition[] {
  return Object.values(AGENT_DEFAULTS)
}

export function isValidAgentId(value: string): value is AgentId {
  return value in AGENT_DEFAULTS
}
