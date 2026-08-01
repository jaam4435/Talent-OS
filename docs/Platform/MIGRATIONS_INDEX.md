# Database Migrations Index — Gap-Relevant Study Guide

Path prefix: `supabase/migrations/`

**Total:** 23 migrations (001–023).

## Study Priority

### P0 — Security & reliability gaps

| File | Lines | Gap IDs | Issue |
|------|------:|---------|-------|
| `004_views_analytics.sql` | 127 | SEC-001, PERF-003 | Analytics views — secured in 020 |
| `006_complete_rls_and_integrity.sql` | 810 | DB-001 | `emit_domain_event` RPC grants |
| `019_platform_observability.sql` | 249 | SEC-002, OBS-009 | Observability views |
| `020_enterprise_hardening.sql` | — | SEC-001/002 | Secure RPCs, view revokes |

### P1 — Feature foundations

| File | Gap IDs | Notes |
|------|---------|-------|
| `005_event_infrastructure.sql` | REL-* | Outbox + webhook deliveries |
| `014_workflow_engine.sql` | OBS-001 | Workflow runs/jobs |
| `015_whatsapp_conversations.sql` | WA-* | Conversation state |
| `016_knowledge_module.sql` | AI-001 | Knowledge + embeddings prep |
| `017_agents_module.sql` | AF-* | Agent configs, sessions |
| `018_agent_framework_extend.sql` | AF-* | Agent messages |
| `021_api_idempotency.sql` | API-* | Distributed idempotency store |
| `022_platform_core.sql` | T-02 | Platform flags + config (Talent OS only) |
| `023_organization_module.sql` | Org Module | Departments, teams, audit logs, org settings |

### P2 — Core schema (baseline)

| File | Notes |
|------|-------|
| `001`–`013` | Core entities, RLS, auth, talent, AI PM, companies |
| `003_functions_triggers.sql` | Payment auto-create on milestone approve |

## Apply Migrations

```bash
SUPABASE_DB_PASSWORD='...' ./scripts/push-supabase-schema.sh
# Applies migrations 001–022
```

Ensure all **001–022** are applied in production before GA.
