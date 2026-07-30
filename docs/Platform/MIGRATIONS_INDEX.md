# Database Migrations Index — Gap-Relevant Study Guide

Path prefix: `supabase/migrations/`

**Total:** 19 migrations (001–019). README incorrectly lists 001–006 only.

## Study Priority

### P0 — Security & reliability gaps

| File | Lines | Gap IDs | Issue |
|------|------:|---------|-------|
| `004_views_analytics.sql` | 127 | SEC-001, PERF-003 | `GRANT SELECT TO authenticated` on cross-tenant views |
| `006_complete_rls_and_integrity.sql` | 810 | DB-001 | `emit_domain_event` revoked from PUBLIC, not granted to authenticated |
| `019_platform_observability.sql` | 249 | SEC-002, OBS-009 | Observability views granted to all authenticated |

### P1 — Feature foundations with gaps

| File | Lines | Gap IDs | Issue |
|------|------:|---------|-------|
| `005_event_infrastructure.sql` | 279 | REL-* | Outbox + webhook deliveries (good); user emit RPC issue in 006 |
| `014_workflow_engine.sql` | 119 | OBS-001 | Workflow tables; instrumentation not wired |
| `015_whatsapp_conversations.sql` | 37 | WA-* | Conversation state |
| `016_knowledge_module.sql` | 227 | AI-001 | Embeddings table placeholder — no pgvector |
| `017_agents_module.sql` | 190 | AF-* | Agent configs, sessions, memory |
| `018_agent_framework_extend.sql` | 42 | AF-* | Agent messages, Support agent |

### P2 — Core schema (baseline understanding)

| File | Lines | Notes |
|------|------:|-------|
| `001_initial_schema.sql` | 380 | Core entities |
| `002_rls_policies.sql` | 363 | RLS; shortlists missing DELETE policy |
| `003_functions_triggers.sql` | 339 | DB functions |
| `007_auth_invite_functions.sql` | 128 | Invite RPCs |
| `008_create_project_rpc.sql` | 133 | Atomic project create |
| `009_talent_portfolio_system.sql` | 216 | Portfolio |
| `010_ai_pm_system.sql` | 18 | AI PM columns |
| `011_add_client_role.sql` | 2 | Client role enum |
| `012_core_schema_companies_clients.sql` | 209 | CRM |
| `013_project_workflow_fixes.sql` | 337 | Workflow fixes |

## Key SQL Patterns to Review

### Analytics view grants (SEC-001)

```sql
-- 004_views_analytics.sql
GRANT SELECT ON v_dashboard_summary TO authenticated;
GRANT SELECT ON v_opportunity_fill_rate TO authenticated;
-- ... all authenticated users can SELECT; filter depends on app query
```

### Domain event RPC (DB-001)

```sql
-- 006_complete_rls_and_integrity.sql
REVOKE ALL ON FUNCTION public.emit_domain_event(...) FROM PUBLIC;
-- Not followed by GRANT TO authenticated
```

### Observability view grants (SEC-002)

```sql
-- 019_platform_observability.sql
GRANT SELECT ON v_observability_workflow_health TO authenticated;
GRANT SELECT ON v_observability_queue_depth TO authenticated;
-- ... etc
```

## Recommended Fixes (documented, not implemented)

1. Add `tenant_id` filter inside view definitions OR restrict grants to service role only.
2. `GRANT EXECUTE ON FUNCTION emit_domain_event TO authenticated` OR route all emits through service role in repository.
3. Enable `pgvector` extension; populate `knowledge_embeddings.embedding` column.
4. Add index: `CREATE INDEX idx_freelancers_tenant_phone ON freelancers(tenant_id, phone);`
5. Add `audit_logs` partitioned table for compliance (future).

## Apply Migrations

```bash
supabase db push
# or
./scripts/push-supabase-schema.sh
```

Ensure all 001–019 are applied in production before GA.
