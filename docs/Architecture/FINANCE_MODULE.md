# Finance Module

**Document version:** 1.0.0  
**Date:** August 2, 2026  
**Status:** Implemented  
**Migration:** `033_finance_module.sql`

---

## Overview

The Finance Module exposes milestone-linked **payments** through REST APIs with an immutable audit trail and namespaced domain events. It replaces Server Actions for approve/mark-paid flows while preserving the legacy `FinanceService` facade.

**Backward compatibility:** `FinanceService`, milestone-triggered payment creation, and DB status triggers remain unchanged.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  REST API  /api/finance/payments/*                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  FinanceModuleService                                       │
│  + legacy FinanceService (delegates)                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
     InvoiceRepository (payments table) + FinanceRepository
                            │
     finance_audit_logs + domain_events (finance.payment.*)
```

| Layer | Location |
|-------|----------|
| Types & validation | `modules/finance/` |
| Repositories | `lib/repositories/invoice.repository.ts`, `lib/repositories/finance.repository.ts` |
| Module service | `lib/services/finance-module.service.ts` |
| Legacy service | `lib/services/finance.service.ts` |
| REST routes | `app/api/finance/payments/` |
| UI | `app/(dashboard)/payments/page.tsx`, `modules/finance/components/` |
| MCP adapter | `lib/mcp/adapters/finance.adapter.ts` |

---

## REST Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/finance/payments` | `payments:read` | List payments (role-scoped) |
| GET | `/api/finance/payments/{id}` | `payments:read` | Detail + timeline |
| POST | `/api/finance/payments/{id}/approve` | `payments:approve` | pending → approved |
| POST | `/api/finance/payments/{id}/mark-paid` | `payments:pay` | approved → paid |

Permission aliases: `finance:read`, `finance:approve`, `finance:mark_paid` map to `payments:*`.

---

## State Machine

```
pending → approved → paid
```

Invalid transitions return `VALIDATION_ERROR`.

---

## Audit & Events

| Action | Audit action | Domain event |
|--------|--------------|--------------|
| Approve | `payment.approved` | `finance.payment.approved` |
| Mark paid | `payment.paid` | `finance.payment.paid` |

Audit rows are stored in `finance_audit_logs` with before/after JSON snapshots.

---

## UI

- Payments table at `/payments` with inline actions
- Detail modal with status timeline (`PaymentDetailPanel`)
- Approve (manager/admin) and mark-paid (admin) via `financeApi` + `useFinance` hook
- Freelancers: read-only view of own payments

---

## MCP

Finance MCP tools (`finance_list_payments`, `finance_get_payment`, `finance_approve_payment`, `finance_mark_paid`) route through `FinanceModuleService` via `lib/mcp/adapters/finance.adapter.ts`.

---

## Related docs

- `docs/Architecture/specs/FINANCE_SPEC.md`
- `docs/Architecture/API_SPECIFICATION.md` §7
- OpenAPI: `docs/openapi.yaml` — Finance tag endpoints
