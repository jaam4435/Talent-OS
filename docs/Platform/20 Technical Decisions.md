# 20 — Technical Decisions

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Status** | Draft — Awaiting Approval |
| **Owner** | Platform Architecture |
| **Related** | [06 C4 Architecture](06%20C4%20Architecture.md) · [19 Roadmap](19%20Roadmap.md) · [15 Engineering Standards](15%20Engineering%20Standards.md) |

---

## ADR Format

Each decision follows:

- **Status:** Proposed | Accepted | Deprecated | Superseded
- **Context:** Why the decision was needed
- **Decision:** What we chose
- **Consequences:** Trade-offs and follow-ups

---

## TD-001: Modular Monolith on Next.js

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026 (MVP) |

**Context:** Small team, rapid iteration, unified deployment needed.

**Decision:** Single Next.js 15 application with modular domain structure — not microservices.

**Consequences:**
- ✅ Simple deployment (Vercel), shared types, easy refactoring
- ✅ Clear module boundaries via services + events
- ⚠️ Must enforce layering discipline as team grows
- 📋 Extract services only when scaling demands (Phase 4+)

See [06 C4 Architecture](06%20C4%20Architecture.md).

---

## TD-002: Supabase as Primary Backend

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026 (MVP) |

**Context:** Need Auth, PostgreSQL, Storage, Realtime without ops overhead.

**Decision:** Supabase for database, auth, storage. Service role for system operations.

**Consequences:**
- ✅ RLS-native multi-tenancy
- ✅ Managed backups and pooling
- ⚠️ SECURITY DEFINER hygiene critical
- ⚠️ Service role bypass requires application-level tenant filtering

See [13 Security Model](13%20Security%20Model.md) · [18 Data Model](18%20Data%20Model.md).

---

## TD-003: Consolidate Talent Domain

| Field | Value |
|-------|-------|
| **Status** | Proposed |
| **Date** | 2026-07-30 |

**Context:** Talent logic split across `lib/services/talent.service.ts`, `lib/domains/talent/`, and `lib/talent/queries.ts`. PortfolioService not in main factory.

**Decision:** Merge into single talent module registered in `createServices()`. Deprecate `lib/talent/queries.ts`.

**Consequences:**
- ✅ Single DI path, easier testing
- ⚠️ Migration effort; must not break existing imports
- 📋 Phase 1 deliverable

See [03 Business Domains](03%20Business%20Domains.md).

---

## TD-004: Transactional Outbox for Side Effects

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026 (Sprint) |

**Context:** Need reliable async processing without dual-write problems.

**Decision:** `domain_events` table as transactional outbox. Cron dispatches to workflow engine and n8n.

**Consequences:**
- ✅ At-least-once delivery with idempotency
- ⚠️ Requires atomic claim and index alignment (Phase 1)
- ⚠️ Cron throughput limits (~100/min)

See [09 Workflow Platform](09%20Workflow%20Platform.md) · [16 Event Catalog](16%20Event%20Catalog.md).

---

## TD-005: Single AI Gateway

| Field | Value |
|-------|-------|
| **Status** | Accepted (enforcement incomplete) |
| **Date** | 2026 |

**Context:** Multiple AI integration paths risk governance bypass and cost overruns.

**Decision:** All LLM calls through `lib/ai/gateway.ts`. PromptManager for all prompts.

**Consequences:**
- ✅ Provider abstraction, fallback, logging
- ⚠️ Legacy paths and `digest` bypass remain — Phase 1 cleanup
- ⚠️ Must add lint rule to prevent direct provider calls

See [07 AI Platform](07%20AI%20Platform.md).

---

## TD-006: Three Invitation Domains

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07 (Marketplace design) |

**Context:** Team invites, gig broadcasts, and marketplace invitations have different lifecycles and permissions.

**Decision:** Separate tables and flows:
- `member_invites` — team
- `opportunity_recipients` — gig broadcast
- `marketplace_invitations` — cross-tenant (planned)

**Consequences:**
- ✅ Clear RBAC per flow
- ⚠️ Must not conflate in UI or API naming

See [11 Marketplace Platform](11%20Marketplace%20Platform.md).

---

## TD-007: MCP as Agent API Surface

| Field | Value |
|-------|-------|
| **Status** | Accepted (adapters pending) |
| **Date** | 2026 |

**Context:** Agents need typed, permissioned access to business capabilities.

**Decision:** MCP tool catalog per domain. Gateway authorizes then routes to service adapters.

**Consequences:**
- ✅ Same RBAC as humans; discoverable tool catalog
- ⚠️ Adapters not yet implemented — Phase 2
- 📋 Future: HTTP MCP transport for external clients

See [08 MCP Platform](08%20MCP%20Platform.md).

---

## TD-008: WhatsApp via n8n Outbound

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026 (MVP) |

**Context:** WhatsApp Cloud API template management and delivery tracking via existing n8n investment.

**Decision:** Inbound direct to Talent OS; outbound via n8n dispatch.

**Consequences:**
- ✅ Template management in n8n; no Meta API token in all code paths
- ⚠️ Added latency for replies
- 📋 Phase 2: optional direct send for agent responses

See [12 WhatsApp Platform](12%20WhatsApp%20Platform.md).

---

## TD-009: Code-Defined Workflow Registry

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026 |

**Context:** Need version-controlled, testable workflow definitions.

**Decision:** Workflows defined in `lib/workflows/registry.ts` (TypeScript), not DB or UI builder.

**Consequences:**
- ✅ Type-safe, reviewable, testable
- ⚠️ Non-technical users cannot edit workflows
- 📋 Phase 4: optional tenant-configurable packs on top of registry

See [09 Workflow Platform](09%20Workflow%20Platform.md).

---

## TD-010: pgvector for Knowledge Embeddings

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026 |

**Context:** Need semantic search for knowledge base within existing PostgreSQL.

**Decision:** `vector(1536)` column with HNSW index in `knowledge_embeddings`. OpenAI-compatible dimensions.

**Consequences:**
- ✅ No separate vector DB to operate
- ⚠️ Embedding worker needed (Phase 2)
- ⚠️ May revisit if scale exceeds PostgreSQL vector performance

See [10 Knowledge Platform](10%20Knowledge%20Platform.md).

---

## TD-011: Fail-Closed Security Defaults

| Field | Value |
|-------|-------|
| **Status** | Proposed |
| **Date** | 2026-07-30 |

**Context:** Audit found optional webhook verification and authorization bypasses.

**Decision:** Production environment rejects requests when security config is incomplete. Approvals fail closed on null approver.

**Consequences:**
- ✅ Prevents silent security degradation
- ⚠️ Stricter dev setup — document in developer guide
- 📋 Phase 0 deliverable

See [13 Security Model](13%20Security%20Model.md).

---

## TD-012: Documentation as Code

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07 |

**Context:** Docs drift from codebase without automation.

**Decision:** Auto-generate catalogs from source (`scripts/generate-docs.mjs`). CI `docs:check` gate. Platform blueprint in `docs/Platform/` for architectural truth.

**Consequences:**
- ✅ Reference catalogs always fresh
- ⚠️ Platform docs require manual updates on architecture changes
- 📋 Consider partial codegen for event catalog (future)

See [15 Engineering Standards](15%20Engineering%20Standards.md).

---

## Deprecated / Superseded

| ID | Decision | Superseded By |
|----|----------|---------------|
| — | Direct OpenAI client calls | TD-005 AI Gateway |
| — | Inline WhatsApp prompts | TD-005 PromptManager migration |
| — | n8n-only AI execution | TD-005 + workflow `execute_ai` (coexist until Phase 2) |

---

## Decision Log Process

1. Propose ADR in this document (status: Proposed)
2. Architecture review
3. Update status to Accepted
4. Reference ADR ID in PR descriptions
5. Deprecate with migration notes when superseded

---

## Cross-References

| Document | Relationship |
|----------|--------------|
| [19 Roadmap](19%20Roadmap.md) | When decisions get implemented |
| [02 Product Philosophy](02%20Product%20Philosophy.md) | Principles behind decisions |
| [FINAL Audit](../FINAL_AUDIT.md) | Decisions triggered by audit |
| [docs/11-enterprise-system-architecture.md](../11-enterprise-system-architecture.md) | Legacy HLD |
