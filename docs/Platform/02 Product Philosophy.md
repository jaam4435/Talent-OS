# 02 — Product Philosophy

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Status** | Draft — Awaiting Approval |
| **Owner** | Platform Architecture |
| **Related** | [01 Vision](01%20Vision.md) · [03 Business Domains](03%20Business%20Domains.md) · [15 Engineering Standards](15%20Engineering%20Standards.md) |

---

## Purpose

This document defines **how we build**, not just **what we build**. It aligns product, design, and engineering decisions across Talent OS platform evolution.

---

## Core Beliefs

### 1. Operations Are the Product

Agencies do not buy software — they buy **outcomes**: filled gigs, delivered projects, paid freelancers, retained clients. Every feature must map to an operational workflow that reduces friction in the real world.

**Implication:** Features ship with events, notifications, and WhatsApp paths — not dashboard-only.

### 2. Freelancers Live on WhatsApp

Creative freelancers do not live in SaaS dashboards. WhatsApp is not a notification channel — it is a **first-class interface** with parity to web for core actions.

**Implication:** See [12 WhatsApp Platform](12%20WhatsApp%20Platform.md). Intent handlers delegate to services; no duplicated business logic.

### 3. AI Must Be Trustworthy

AI assists decisions; humans retain authority. All LLM calls are governed, logged, and tenant-configurable. Prompts are server-side only. User content is treated as untrusted input.

**Implication:** See [07 AI Platform](07%20AI%20Platform.md). No `digest` bypass paths in target state.

### 4. Events Are the Nervous System

If something important happens, the platform **emits an event**. Downstream systems (workflows, n8n, agents, analytics) react — they are not hard-coded into service methods.

**Implication:** See [16 Event Catalog](16%20Event%20Catalog.md). Synchronous code paths stay thin.

### 5. Tenants Are Fortresses

Multi-tenancy is non-negotiable. Data isolation via RLS, explicit tenant context in every service call, and fail-closed authorization.

**Implication:** See [13 Security Model](13%20Security%20Model.md).

### 6. Platform Over Features

Domains expose capabilities through services, events, and MCP tools. UI is one consumer; agents and integrations are equal citizens.

**Implication:** See [08 MCP Platform](08%20MCP%20Platform.md) · [17 API Standards](17%20API%20Standards.md).

---

## Design Principles

| # | Principle | Example |
|---|-----------|---------|
| D1 | **Extend, don't fork** | Marketplace builds on `freelancers`, not a parallel talent table |
| D2 | **Opt-in visibility** | Marketplace profiles private by default |
| D3 | **Idempotent by default** | Webhook dedup keys, event idempotency keys |
| D4 | **Fail closed** | Missing webhook secret → reject in production |
| D5 | **Single source of truth** | Services own mutations; pages never touch repositories |
| D6 | **Progressive disclosure** | Managers see full context; clients see scoped views |
| D7 | **Backwards compatible** | Migrations additive; deprecated paths supported until removal window |
| D8 | **Observable** | Correlation IDs from user action → event → workflow → n8n |

---

## Priority Stack (Engineering)

When trade-offs arise, resolve in this order:

1. Long-term maintainability
2. Scalability
3. Security
4. Developer experience
5. Performance
6. AI-first architecture
7. Event-driven architecture
8. API-first architecture
9. WhatsApp-first operations
10. Platform-first thinking

**Never optimize for writing code quickly. Always optimize for architecture.**

---

## User Experience Philosophy

### Managers: Clarity Over Density

Dashboards answer: *What needs my attention today?* AI summaries and status assessments reduce cognitive load. Approvals are explicit gates, not buried settings.

### Freelancers: Minimal Friction

Three-tap rule for common actions on WhatsApp: respond to gig, start milestone, submit work. Free text routes to agent when configured. No login required for messaging flows.

### Clients: Scoped Transparency

Clients see their company's projects and approved knowledge — never internal ratings, margins, or roster notes.

### Agents: Same Rules as Humans

Agents inherit invoking user's RBAC. Tool allowlists are configurable per tenant but cannot escalate privileges.

---

## Data Philosophy

| Data Type | Treatment |
|-----------|-----------|
| **Transactional** | PostgreSQL, RLS, audited mutations |
| **Operational** | Events, jobs, webhook deliveries — lifecycle-managed with archival |
| **Knowledge** | Full-text now; vectors for semantic search; embeddings tenant-scoped |
| **AI artifacts** | Prompt hashes and results — never raw prompts in DB |
| **Secrets** | Encrypted at rest; never in client bundles |

See [18 Data Model](18%20Data%20Model.md).

---

## Integration Philosophy

| Integration | Role |
|-------------|------|
| **n8n** | External orchestration for email, templates, complex multi-step flows |
| **WhatsApp Cloud API** | Primary freelancer channel |
| **AI providers** | Replaceable via gateway abstraction |
| **Supabase** | Auth, database, storage, realtime (scoped) |
| **Vercel** | Application hosting and cron |

The platform owns **business truth**. Integrations own **delivery mechanics**.

---

## What We Reject

- Duplicating business logic in webhook handlers, n8n flows, or agent prompts
- Feature flags that bypass AI governance
- SECURITY DEFINER functions without caller validation
- UI-only APIs that agents cannot call
- Breaking changes without migration path and documentation

---

## Cross-References

| Document | Relationship |
|----------|--------------|
| [01 Vision](01%20Vision.md) | Strategic north star |
| [03 Business Domains](03%20Business%20Domains.md) | Domain boundaries |
| [13 Security Model](13%20Security%20Model.md) | Security principles in practice |
| [20 Technical Decisions](20%20Technical%20Decisions.md) | Recorded ADRs |
