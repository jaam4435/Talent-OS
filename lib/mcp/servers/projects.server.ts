import type { McpServerDefinition, McpToolDefinition } from '@/lib/mcp/types'
import { idOutputSchema, objectSchema, paginationProperties } from '@/lib/mcp/schemas/common'

export const PROJECTS_TOOLS = [
  {
    name: 'projects_list',
    title: 'List Projects',
    description: 'List projects for the tenant with optional status and freelancer filters.',
    inputSchema: objectSchema(
      {
        status: {
          type: 'string',
          enum: ['draft', 'active', 'in_review', 'completed', 'archived', 'canceled'],
        },
        freelancer_id: { type: 'string', description: 'Filter by assigned freelancer.' },
        company_id: { type: 'string', description: 'Filter by client company.' },
        ...paginationProperties,
      },
      []
    ),
    requiredPermission: 'projects:read',
  },
  {
    name: 'projects_get',
    title: 'Get Project',
    description: 'Retrieve project details including milestones and assigned talent.',
    inputSchema: objectSchema({ project_id: { type: 'string' } }, ['project_id']),
    requiredPermission: 'projects:read',
  },
  {
    name: 'projects_create',
    title: 'Create Project',
    description: 'Create a project with optional initial milestones.',
    inputSchema: objectSchema(
      {
        title: { type: 'string' },
        freelancer_id: { type: 'string', description: 'Assigned freelancer UUID.' },
        company_id: { type: 'string' },
        opportunity_id: { type: 'string' },
        budget: { type: 'number' },
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              amount: { type: 'number' },
              due_date: { type: 'string', description: 'ISO 8601 date.' },
            },
            required: ['title', 'amount'],
          },
        },
      },
      ['title', 'freelancer_id']
    ),
    outputSchema: idOutputSchema,
    destructive: true,
    requiredPermission: 'projects:create',
  },
  {
    name: 'projects_update_status',
    title: 'Update Project Status',
    description: 'Transition a project to a new lifecycle status.',
    inputSchema: objectSchema(
      {
        project_id: { type: 'string' },
        status: {
          type: 'string',
          enum: ['draft', 'active', 'in_review', 'completed', 'archived', 'canceled'],
        },
      },
      ['project_id', 'status']
    ),
    destructive: true,
    requiredPermission: 'projects:update',
  },
  {
    name: 'projects_list_milestones',
    title: 'List Milestones',
    description: 'List milestones for a project ordered by sort order.',
    inputSchema: objectSchema({ project_id: { type: 'string' } }, ['project_id']),
    requiredPermission: 'projects:read',
  },
  {
    name: 'projects_submit_milestone',
    title: 'Submit Milestone',
    description: 'Freelancer submits deliverables for milestone review.',
    inputSchema: objectSchema(
      {
        milestone_id: { type: 'string' },
        submission_note: { type: 'string' },
        submission_files: {
          type: 'array',
          items: { type: 'string', description: 'Storage paths from Storage MCP.' },
        },
      },
      ['milestone_id']
    ),
    destructive: true,
    requiredPermission: 'milestones:submit',
  },
  {
    name: 'projects_review_milestone',
    title: 'Review Milestone',
    description: 'Manager approves or requests revision on a submitted milestone.',
    inputSchema: objectSchema(
      {
        milestone_id: { type: 'string' },
        decision: { type: 'string', enum: ['approved', 'revision'] },
        review_note: { type: 'string' },
      },
      ['milestone_id', 'decision']
    ),
    destructive: true,
    requiredPermission: 'milestones:review',
  },
] as const satisfies readonly McpToolDefinition[]

export type ProjectsToolName = (typeof PROJECTS_TOOLS)[number]['name']

export interface ProjectsToolInputs {
  projects_list: {
    status?: string
    freelancer_id?: string
    company_id?: string
    page?: number
    limit?: number
  }
  projects_get: { project_id: string }
  projects_create: {
    title: string
    freelancer_id: string
    company_id?: string
    opportunity_id?: string
    budget?: number
    milestones?: Array<{ title: string; amount: number; due_date?: string }>
  }
  projects_update_status: { project_id: string; status: string }
  projects_list_milestones: { project_id: string }
  projects_submit_milestone: {
    milestone_id: string
    submission_note?: string
    submission_files?: string[]
  }
  projects_review_milestone: {
    milestone_id: string
    decision: 'approved' | 'revision'
    review_note?: string
  }
}

export const PROJECTS_SERVER_DEFINITION: McpServerDefinition = {
  metadata: {
    id: 'projects',
    name: 'Talent OS Projects',
    version: '1.0.0',
    description: 'Project lifecycle, milestones, and deliverable workflows.',
    resourcePrefix: 'talentos://projects',
  },
  capabilities: { tools: true, resources: true, prompts: false, logging: true },
  tools: PROJECTS_TOOLS,
  resources: [
    {
      uri: 'talentos://projects/{project_id}',
      name: 'Project Detail',
      mimeType: 'application/json',
    },
    {
      uri: 'talentos://projects/{project_id}/milestones',
      name: 'Project Milestones',
      mimeType: 'application/json',
    },
  ],
}

export interface ProjectsMcpServerInterface {
  readonly definition: typeof PROJECTS_SERVER_DEFINITION
  listTools(): typeof PROJECTS_TOOLS
}
