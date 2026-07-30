# Agent Framework

See [Platform/AGENT_FRAMEWORK_ARCHITECTURE.md](./Platform/AGENT_FRAMEWORK_ARCHITECTURE.md) for the full architecture.

Configurable multi-agent system with seven built-in agents. Each agent exposes six dimensions: **Instructions**, **Tools**, **Permissions**, **Memory**, **Reasoning**, and **Conversation State**. No prompts inside UI components — everything configurable via server-side config and tenant overrides.

## Quick Reference

| Agent | ID |
|---|---|
| Recruiter | `recruiter` |
| Project Manager | `project_manager` |
| Finance | `finance` |
| QA | `qa` |
| Executive | `executive` |
| Knowledge | `knowledge` |
| Support | `support` |

## Key APIs

- `listAgents()` / `getAgent()` — config summaries (no instruction content)
- `updateAgentConfig()` — configure tools, memory, reasoning, conversation
- `prepareAgentRun()` — assemble run context server-side
- `runAgent()` — execute with reasoning loop and tool use
- `getAgentConversationState()` — conversation turn history
- `publishAgentInstruction()` — server-side instruction management

## Migrations

- `017_agents_module.sql` — core schema
- `018_agent_framework_extend.sql` — Support agent, messages, policies
