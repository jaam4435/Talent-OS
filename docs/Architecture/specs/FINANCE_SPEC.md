# Finance & Payments — Implementation Specification

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Draft — awaiting approval  
**Bounded context:** Finance & Payments  
**References:** `DOMAIN_MODEL.md`, `CONTEXT_MAP.md`, `EVENT_CATALOG.md`, `UBIQUITOUS_LANGUAGE.md`

---

## 1. Business Overview

The Finance & Payments context tracks **milestone-linked payments** through a manual approve/mark-paid workflow. It is a thin context — no billing engine, invoicing, or Stripe integration yet.

**Primary actors:** Talent manager (approve), admin (mark paid), freelancer (read own), client (read company payments)  
**Business outcome:** Traceable payment lifecycle tied to milestone approval with workflow-triggered invoice notifications.

---

## 2. Responsibilities

### In scope

- Payment record lifecycle (pending → approved → processing → paid | disputed | canceled)
- Manager approval of pending payments
- Admin mark-paid with external reference
- Payment listing for UI (manager, freelancer, client views)
- DB-triggered domain event emission on status change

### Out of scope

- Payment creation logic (001 schema — auto-created on milestone approval)
- Invoicing engine (future)
- Stripe/payment gateway integration (future)
- Subscription billing (Organization BC — `subscription_reference` only)
- Tax calculation and multi-currency conversion

---

## 3. Public APIs

**Current:** No dedicated `/api/finance/*` module REST API. Payments accessed via:

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | Server Actions / legacy UI routes | Role-based | List payments |
| POST | Server Actions | Manager/admin | Approve, mark paid |

**Future (recommended):**

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/finance/payments` | `finance:read` | List payments |
| GET | `/api/finance/payments/{id}` | `finance:read` | Payment detail |
| POST | `/api/finance/payments/{id}/approve` | `finance:approve` | Approve pending |
| POST | `/api/finance/payments/{id}/mark-paid` | `finance:mark_paid` | Mark paid with reference |

**MCP:** `lib/mcp/servers/finance.server.ts` — agent read access

---

## 4. Internal Services

| Service | Path | Role |
|---------|------|------|
| **FinanceService** | `lib/services/finance.service.ts` | Approve, mark paid, list for UI |

**Repositories:** `InvoiceRepository` (maps to `payments` table)

**No module layer yet:** Future `modules/finance/` with types, validation, events.

---

## 5. Database Schema

**Migration:** `001_initial_schema.sql` (payments), `005_*` (DB triggers for events)

| Table | Purpose |
|-------|---------|
| `payments` | Payment aggregate root (1:1 with milestone) |

**Key columns:** `milestone_id`, `freelancer_id`, `amount`, `currency`, `status`, `payment_reference`, `approved_at`, `paid_at`

**Trigger:** Status change → emit `payment.{status}` domain event

**RLS:** Managers full access; freelancers read own; clients read company project payments.

---

## 6. Aggregates

| Aggregate | Root table | Invariants |
|-----------|------------|------------|
| **Payment** | `payments` | 1:1 with milestone; amount tied at creation; valid status transitions |

**Status lifecycle:**

```
pending → approved → processing → paid
                  ↘ disputed
                  ↘ canceled
```

**Consistency:** Single-row updates per command. Amount immutable after creation.

---

## 7. Domain Events

**DB-triggered (005):** `payment.{status}` for each status transition

**Workflow consumers:**

| Event | Workflow |
|-------|----------|
| `payment.approved` | `wf-invoice` — generate invoice, payment notification |
| `payment.paid` | Notification to freelancer |

**Future namespaced:** `finance.payment.approved`, `finance.payment.paid`

---

## 8. Commands

| Command | Handler | Preconditions |
|---------|---------|---------------|
| ApprovePayment | `FinanceService.approvePayment()` | Status must be `pending`; manager/admin |
| MarkPaymentPaid | `FinanceService.markPaymentPaid()` | Status must be `approved`; admin; reference required |

**System commands (not user-initiated):**

| Command | Trigger | Handler |
|---------|---------|---------|
| CreatePayment | Milestone approved | DB trigger / 001 schema |

---

## 9. Queries

| Query | Handler | Returns |
|-------|---------|---------|
| ListPayments | `FinanceService.listPayments()` | Payments with freelancer map |
| GetPayment | Repository direct | Single payment with milestone link |
| ListPaymentsByFreelancer | Filter | Freelancer-scoped (RLS) |
| ListPaymentsByCompany | Filter | Client-scoped (RLS) |

**Analytics:** Revenue dashboard aggregates paid/pending totals via `get_analytics_revenue` RPC.

---

## 10. Validation Rules

| Rule | Field | Constraint |
|------|-------|------------|
| Approve | status | Must be `pending` |
| Mark paid | status | Must be `approved` |
| Payment reference | `payment_reference` | Required for mark paid; max 256 chars |
| Amount | `amount` | Non-negative; immutable |

**Business rules:**

- Only manager/admin can approve
- Only admin can mark paid (with external reference)
- Payment amount tied to milestone at creation — no manual amount edit

---

## 11. Authorization Rules

| Permission | Roles | Operations |
|------------|-------|------------|
| Payment read (manager) | admin, talent_manager | All tenant payments |
| Payment read (freelancer) | freelancer | Own payments only |
| Payment read (client) | client | Company project payments |
| Approve | admin, talent_manager | pending → approved |
| Mark paid | admin | approved → paid |

**RLS:** Enforced at database level per role.

**Future permissions:** `finance:read`, `finance:approve`, `finance:mark_paid`

---

## 12. AI Capabilities

| Feature | Trigger | Output |
|---------|---------|--------|
| **Finance agent** | Agent invocation | Read payments via MCP |
| **Payment summary** | Future `ai.summary_requested` | Narrative payment status |

**Current:** Read-only MCP tools; no AI mutation of payments.

---

## 13. Background Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| Domain event dispatch | Cron | Process `payment.*` events |
| Invoice workflow | `payment.approved` | n8n invoice generation |

**Future:** Payment aging alerts; disputed payment escalation cron.

---

## 14. Integrations

| System | Direction | Purpose |
|--------|-----------|---------|
| **Project BC** | Inbound | Milestone approval creates payment |
| **Workflow BC** | Outbound | `wf-invoice` on approval |
| **n8n** | Outbound | Invoice generation workflow |
| **Analytics BC** | Outbound | Revenue dashboard |
| **Future Stripe** | Inbound webhook | Automated payment status sync |

---

## 15. Observability

| Signal | Source |
|--------|--------|
| Domain events | `payment.*` in `domain_events` |
| Analytics | Revenue dashboard (paid/pending, aging) |
| Activity log | Payment actions in metadata (future audit table) |

**Alerts (future):** Payments pending approval > 7 days; disputed payment count.

---

## 16. Testing Strategy

| Test | Focus |
|------|-------|
| Unit | Approve/mark-paid state validation |
| Integration | Milestone approved → payment created |
| Integration | Approve → `payment.approved` event → workflow trigger |
| Integration | RLS freelancer/client scoping |
| E2E | Milestone approve → payment approve → mark paid |

**Coverage target:** 80% on `FinanceService` when module REST API added.

---

## 17. Migration Strategy

| Migration | Content |
|-----------|---------|
| `001_initial_schema.sql` | payments table |
| `005_*` | Status change triggers |
| Future `032_finance_module.sql` | Audit logs, REST API, namespaced events |

**Consolidation path:** Extract FinanceService into `FinanceModuleService` with dedicated REST routes.

---

## 18. Future Enhancements

1. **Stripe integration** — Automated payment collection and webhook sync
2. **Invoicing engine** — PDF generation, line items, tax
3. **Multi-currency** — Exchange rate handling
4. **Payment disputes** — Formal dispute workflow with evidence
5. **Freelancer payouts** — Batch payout processing
6. **Finance module REST API** — Full CRUD with audit and namespaced events

---

## Appendix — File map

| Artifact | Path |
|----------|------|
| Service | `lib/services/finance.service.ts` |
| Repository | `lib/repositories/invoice.repository.ts` |
| MCP server | `lib/mcp/servers/finance.server.ts` |
| Schema | `supabase/migrations/001_initial_schema.sql` |
