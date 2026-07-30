# Marketplace Architecture

Architecture blueprint for the Talent OS marketplace layer. Extends the existing **private agency OS** (roster → broadcast → match → shortlist → project) with marketplace capabilities across eight subdomains.

**Scope:** Architecture only — no UI redesign, no service implementation in this iteration.

---

## 1. Position in the System

Talent OS today is a **tenant-private agency operating system**. The marketplace layer adds optional **discovery, engagement, and contracting** capabilities without replacing existing flows.

```
┌─────────────────────────────────────────────────────────────────┐
│                     MARKETPLACE LAYER (new)                      │
│  Profiles · Availability · Ratings · Portfolio · Contracts       │
│  Invitations · Matching · Recommendations                          │
├─────────────────────────────────────────────────────────────────┤
│                   EXISTING AGENCY OS (keep)                      │
│  freelancers · opportunities · shortlists · talent_match_scores  │
│  projects · milestones · payments · AssignmentService              │
├─────────────────────────────────────────────────────────────────┤
│                   SHARED INFRASTRUCTURE                          │
│  Service layer · Workflow engine · AI Gateway · MCP · Agents     │
│  Knowledge module · RLS · domain_events                          │
└─────────────────────────────────────────────────────────────────┘
```

### Design principles

1. **Extend, don't fork** — marketplace builds on `freelancers`, `opportunities`, and `AssignmentService`
2. **Opt-in visibility** — talent and listings are private by default; marketplace requires explicit publish
3. **Same layering** — pages → queries → services → repositories → Supabase
4. **Separate invitation flows** — team invites (`member_invites`) ≠ gig invites (`opportunity_recipients`) ≠ marketplace invites (new)
5. **Contracts as bounded context** — new module, linked to projects at assignment time

---

## 2. Eight Subdomains

### 2.1 Talent Profiles

| Aspect | Detail |
|---|---|
| **Purpose** | Public-facing talent identity derived from private roster records |
| **Existing** | `freelancers` table, `talent_profiles` view, `TalentService`, `lib/domains/talent/` |
| **Extension** | `marketplace_visibility`, `public_slug`, `marketplace_headline`, `marketplace_bio` on `freelancers` |
| **Future service** | `MarketplaceProfileService` — publish/unpublish, slug management, redacted public view |
| **Agent** | Recruiter Agent (`agent.recruiter`) |

**Visibility tiers:**

| Tier | Who sees | Fields exposed |
|---|---|---|
| `private` | Managers + own freelancer | Full roster record |
| `tenant` | All tenant members | Standard profile |
| `marketplace` | Verified buyers (cross-tenant) | Redacted: no internal_notes, no email/phone unless opted in |

### 2.2 Availability

| Aspect | Detail |
|---|---|
| **Purpose** | Structured capacity beyond simple enum (`available` / `busy` / `unavailable`) |
| **Existing** | `freelancers.availability` enum |
| **Extension** | `talent_availability_blocks` — date ranges, capacity %, timezone, block type |
| **Future service** | `MarketplaceAvailabilityService` — calendar blocks, conflict detection, capacity queries |
| **RPC** | `check_talent_availability(freelancer_id, start, end)` |

**Block types:** `available`, `busy`, `booked`, `time_off`

The enum on `freelancers` remains the **summary status**; blocks are the **source of truth** for scheduling.

### 2.3 Ratings

| Aspect | Detail |
|---|---|
| **Purpose** | Reputation — internal manager ratings + optional public/client ratings |
| **Existing** | `freelancers.internal_rating`, `freelancer_rating_history` (manager-only) |
| **Extension** | `marketplace_ratings` — client/submitted, project-linked, visibility-controlled |
| **Future service** | `MarketplaceRatingService` — aggregate public score, moderation |
| **Rule** | Internal ratings never exposed in marketplace views |

**Rating sources:** `internal` (existing), `client`, `peer`, `project_completion`

### 2.4 Portfolio

| Aspect | Detail |
|---|---|
| **Purpose** | Showcase work samples with marketplace visibility control |
| **Existing** | `freelancer_portfolio_items`, Supabase `portfolio` bucket, `PortfolioRepository` |
| **Extension** | `is_marketplace_visible` flag per item; `featured` ordering |
| **Future service** | Extends `TalentService` or `MarketplaceProfileService` |
| **Rule** | Portfolio items default to private; explicit publish per item |

### 2.5 Contracts

| Aspect | Detail |
|---|---|
| **Purpose** | Legal engagement between agency/client and talent before project start |
| **Existing** | None (PRD Phase 2) |
| **New tables** | `marketplace_contracts`, `marketplace_contract_parties`, `marketplace_contract_events` |
| **Future service** | `ContractService` — draft, send, sign, link to project |
| **Workflow** | `contract.signed` → triggers `project.assigned` or milestone creation |
| **Agent** | Finance Agent for payment terms review |

**Contract lifecycle:** `draft` → `sent` → `viewed` → `signed` → `active` → `completed` / `terminated`

### 2.6 Invitations

| Aspect | Detail |
|---|---|
| **Purpose** | Engage talent with gigs, applications, or marketplace opportunities |
| **Existing** | `opportunity_recipients` (broadcast), `member_invites` (team onboarding) |
| **Extension** | `marketplace_invitations` — typed invitations with proposal support |
| **Future service** | `MarketplaceInviteService` — distinct from `AssignmentService.broadcastOpportunity()` |
| **Do not** | Overload `member_invites` for gig invitations |

**Invitation types:**

| Type | Flow | Existing equivalent |
|---|---|---|
| `broadcast` | Agency → roster, interested/declined | `opportunity_recipients` |
| `direct` | Agency → specific talent, with terms | New |
| `application` | Talent → open listing, with proposal | New |
| `marketplace` | Cross-tenant discovery invite | New |

Existing `opportunity_recipients` continues to serve private broadcast. New table handles marketplace-specific flows with proposals and bids.

### 2.7 Matching

| Aspect | Detail |
|---|---|
| **Purpose** | Rank talent against opportunities/requirements |
| **Existing** | `talent_match_scores`, AI matching (`lib/integrations/ai/matching.ts`), SQL fallback RPC |
| **Extension** | `match_source`, `match_context` on scores; widen candidate pool when marketplace enabled |
| **Future service** | Extends `AIService` + new `MarketplaceMatchingService` |
| **Agent** | Recruiter Agent tools: `ai_match_talent`, `talent_search` |

**Match sources:** `ai`, `rule_based`, `marketplace`, `manual`

Candidate pool logic:

```
IF opportunity.visibility = 'marketplace'
  THEN pool = tenant_roster + marketplace_visible_talent
  ELSE pool = tenant_roster (existing behavior)
```

### 2.8 Recommendations

| Aspect | Detail |
|---|---|
| **Purpose** | Proactive talent/opportunity suggestions beyond single-opportunity matching |
| **Existing** | AI match panel (reactive, per-opportunity) |
| **Extension** | `marketplace_recommendations` — entity-pair suggestions with rationale and expiry |
| **Future service** | `MarketplaceRecommendationService` — cron/workflow-generated |
| **Agent** | Recruiter Agent + Knowledge Agent for context |

**Recommendation types:**

| Type | Example |
|---|---|
| `talent_for_opportunity` | "Jane fits the Acme brief (92% skill overlap)" |
| `opportunity_for_talent` | "New motion design gig matches your portfolio" |
| `similar_talent` | "Candidates like your top pick" |
| `re_engagement` | "Freelancer X hasn't been booked in 90 days" |

---

## 3. Data Model

Migration: `supabase/migrations/018_marketplace_architecture.sql`

```
freelancers (extended)
  + marketplace_visibility, public_slug, marketplace_headline, marketplace_bio
  + marketplace_published_at

freelancer_portfolio_items (extended)
  + is_marketplace_visible, featured

talent_availability_blocks (new)
  freelancer_id, block_type, starts_at, ends_at, capacity_pct, timezone, notes

marketplace_ratings (new)
  freelancer_id, source, rating, reviewer_type, project_id, visibility, review_text

marketplace_contracts (new)
  tenant_id, project_id?, opportunity_id?, status, terms, document_path, signed_at

marketplace_contract_parties (new)
  contract_id, party_type, entity_type, entity_id, signed_at

marketplace_invitations (new)
  tenant_id, type, opportunity_id?, freelancer_id, listing_id?, status, proposal

marketplace_recommendations (new)
  tenant_id, type, source_entity, target_entity, score, rationale, expires_at

talent_match_scores (extended)
  + match_source, match_context
```

See migration file for full DDL, indexes, and RLS stubs.

---

## 4. Service Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    MarketplaceService                         │
│  (orchestrator — future, not implemented yet)                 │
├────────────┬────────────┬────────────┬────────────┬───────────┤
│ Profile    │ Availability│ Rating    │ Portfolio  │ Contract  │
│ Service    │ Service     │ Service   │ (extends   │ Service   │
│            │             │           │  Talent)   │           │
├────────────┴────────────┴────────────┴────────────┴───────────┤
│ InviteService │ MatchingService │ RecommendationService        │
│ (extends AssignmentService patterns)                          │
├──────────────────────────────────────────────────────────────┤
│ Existing: TalentService · AssignmentService · AIService       │
└──────────────────────────────────────────────────────────────┘
```

### Reuse map

| Marketplace concern | Delegate to |
|---|---|
| Profile CRUD (private) | `TalentService` |
| Profile publish | `MarketplaceProfileService` (future) |
| Broadcast to roster | `AssignmentService.broadcastOpportunity()` |
| AI matching | `AIService.requestTalentMatch()` |
| Shortlist management | `AssignmentService` |
| Project creation | `ProjectService.createProjectWithMilestones()` |
| Knowledge context | `KnowledgeService` |
| Recruiter automation | Recruiter Agent |

Interface contracts: `modules/marketplace/interfaces.ts`

---

## 5. Event Model

New domain events (register in workflow engine when implemented):

| Event | Trigger | Downstream |
|---|---|---|
| `marketplace.profile_published` | Talent opts into marketplace | Index for discovery |
| `marketplace.invitation_sent` | Direct/marketplace invite | Notification + n8n |
| `marketplace.application_received` | Talent applies to listing | Manager notification |
| `marketplace.contract_signed` | All parties sign | Create project |
| `marketplace.recommendation_generated` | Cron/agent | Notification digest |
| `marketplace.match_completed` | AI match with marketplace pool | Update recommendations |

Existing events unchanged: `opportunity.broadcast`, `project.assigned`, etc.

---

## 6. RLS Strategy

Current RLS is strictly tenant-private. Marketplace adds a **third policy tier**:

| Tier | Policy helper | Access |
|---|---|---|
| Private | `is_manager_of(tenant_id)` | Full roster (existing) |
| Tenant | `is_member_of(tenant_id)` | Tenant-visible profiles |
| Marketplace | `is_marketplace_visible(freelancer_id)` | Redacted public read |

New helper functions (future migration):

- `marketplace_visible_freelancer_ids()` — opted-in talent
- `is_marketplace_buyer()` — verified cross-tenant access
- `get_marketplace_profile(freelancer_id)` — returns redacted view

Public routes (future, not in this iteration) would use service-role + redacted views, never raw table access.

---

## 7. Code Layout (planned)

```
modules/marketplace/
  types.ts           — domain types (this iteration)
  validation.ts      — Zod schemas
  interfaces.ts      — service contracts
  index.ts

lib/marketplace/
  boundaries.ts      — subdomain → existing/new component map
  index.ts

lib/services/        — (future)
  marketplace-profile.service.ts
  marketplace-availability.service.ts
  marketplace-rating.service.ts
  contract.service.ts
  marketplace-invite.service.ts
  marketplace-matching.service.ts
  marketplace-recommendation.service.ts

lib/repositories/    — (future)
  marketplace-*.repository.ts

supabase/migrations/
  018_marketplace_architecture.sql   — schema blueprint (this iteration)
```

No UI changes. Existing pages (`/talent`, `/opportunities`) continue to work unchanged.

---

## 8. MCP & Agent Integration (planned)

| MCP Tool (future) | Subdomain |
|---|---|
| `marketplace_search_profiles` | Profiles |
| `marketplace_check_availability` | Availability |
| `marketplace_get_ratings` | Ratings |
| `marketplace_list_portfolio` | Portfolio |
| `marketplace_get_contract` | Contracts |
| `marketplace_send_invitation` | Invitations |
| `marketplace_run_match` | Matching |
| `marketplace_get_recommendations` | Recommendations |

Recruiter Agent registry already includes talent + matching tools. Extend allowlist when marketplace tools are added.

---

## 9. Implementation Phases

| Phase | Scope | Depends on |
|---|---|---|
| **Phase 0** (this PR) | Architecture doc, types, interfaces, schema blueprint | — |
| **Phase 1** | Profile visibility + portfolio flags | Phase 0 |
| **Phase 2** | Availability blocks + invitation types | Phase 1 |
| **Phase 3** | Public ratings + recommendations | Phase 2 |
| **Phase 4** | Contracts + e-sign integration | Phase 3 |
| **Phase 5** | Cross-tenant discovery + public routes | Phase 4 |

---

## 10. Related Docs

- `docs/25-talent-domain-refactor.md` — talent module migration plan
- `docs/18-sprint-4-matching-engine.md` — existing matching implementation
- `docs/13-ai-talent-matching-service.md` — AI matching service
- `docs/34-agent-framework.md` — Recruiter Agent for sourcing automation
- `modules/marketplace/interfaces.ts` — service contracts
