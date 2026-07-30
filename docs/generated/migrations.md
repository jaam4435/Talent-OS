<!-- AUTO-GENERATED — do not edit manually. Run: npm run docs:generate -->
# Database Migrations (Generated)

| # | File | Summary |
|---|---|---|
| 001 | [`001_initial_schema.sql`](../../supabase/migrations/001_initial_schema.sql) | Talent OS — Initial Schema Migration |
| 002 | [`002_rls_policies.sql`](../../supabase/migrations/002_rls_policies.sql) | Talent OS — Row-Level Security Policies |
| 003 | [`003_functions_triggers.sql`](../../supabase/migrations/003_functions_triggers.sql) | Talent OS — Functions, Triggers & Business Logic |
| 004 | [`004_views_analytics.sql`](../../supabase/migrations/004_views_analytics.sql) | Talent OS — Analytics Views & Seed Data |
| 005 | [`005_event_infrastructure.sql`](../../supabase/migrations/005_event_infrastructure.sql) | Talent OS — Event Infrastructure Migration |
| 006 | [`006_complete_rls_and_integrity.sql`](../../supabase/migrations/006_complete_rls_and_integrity.sql) | Talent OS — Complete RLS, Integrity Constraints & Schema Completions |
| 007 | [`007_auth_invite_functions.sql`](../../supabase/migrations/007_auth_invite_functions.sql) | Sprint 1: Member invite accept/revoke and public preview |
| 008 | [`008_create_project_rpc.sql`](../../supabase/migrations/008_create_project_rpc.sql) | Sprint 2: Atomic project creation with milestones |
| 009 | [`009_talent_portfolio_system.sql`](../../supabase/migrations/009_talent_portfolio_system.sql) | Sprint 3: Talent system — portfolio items, rating history, profile audit |
| 010 | [`010_ai_pm_system.sql`](../../supabase/migrations/010_ai_pm_system.sql) | Sprint 6: AI Project Manager — requirements storage and status assessment fields |
| 011 | [`011_add_client_role.sql`](../../supabase/migrations/011_add_client_role.sql) | Add client role enum value (must be in its own migration — PG cannot use new enum values in the same transaction) |
| 012 | [`012_core_schema_companies_clients.sql`](../../supabase/migrations/012_core_schema_companies_clients.sql) | Core schema alignment: companies, client role, canonical views (users, talent_profiles) |
| 013 | [`013_project_workflow_fixes.sql`](../../supabase/migrations/013_project_workflow_fixes.sql) | Project workflow fixes: invite revoke, payments RLS, client read access, view security, company-aware RPC |
| 014 | [`014_workflow_engine.sql`](../../supabase/migrations/014_workflow_engine.sql) | Talent OS — Workflow Engine |
| 015 | [`015_whatsapp_conversations.sql`](../../supabase/migrations/015_whatsapp_conversations.sql) | WhatsApp conversation context for first-class messaging interface |
| 016 | [`016_knowledge_module.sql`](../../supabase/migrations/016_knowledge_module.sql) | Talent OS — Knowledge Module |
| 017 | [`017_agents_module.sql`](../../supabase/migrations/017_agents_module.sql) | Talent OS — Agent Framework |
| 018 | [`018_marketplace_architecture.sql`](../../supabase/migrations/018_marketplace_architecture.sql) | Talent OS — Marketplace Architecture (Schema Blueprint) |

**Total:** 18 migrations — apply in filename order
