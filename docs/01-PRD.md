# Talent OS — Product Requirements Document

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-07-01  
**Product:** Talent Operating System (Talent OS)  
**Target Market:** Creative agencies (design, video, copy, motion, brand)

---

## 1. Executive Summary

Talent OS is a multi-tenant SaaS platform that helps creative agencies manage their freelance talent pool end-to-end: discovery, opportunity broadcasting, shortlisting, project assignment, delivery tracking, payments, and analytics. The system replaces fragmented spreadsheets, email threads, and WhatsApp groups with a unified operating layer that keeps agency staff and freelancers aligned in real time.

**Core value proposition:** Reduce time-to-staff by 60%, improve fill rates on opportunities, and give agency leadership visibility into talent utilization, project health, and payment obligations.

---

## 2. Problem Statement

Creative agencies rely on a rotating network of freelancers but lack a purpose-built system to:

| Pain Point | Impact |
|---|---|
| Talent data scattered across spreadsheets and CRMs | Slow matching, duplicate records, stale skills |
| Opportunity broadcast via email/WhatsApp | Low response rates, no audit trail |
| Manual shortlisting in shared docs | Bias, version conflicts, lost context |
| Project status in siloed tools | Missed deadlines, poor client communication |
| Payment tracking in accounting only | Freelancer disputes, cash flow surprises |
| No cross-project analytics | Cannot optimize roster or pricing |

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

- Enable agencies to onboard and operate within 1 business day
- Support 100+ freelancers per tenant without performance degradation
- Achieve 95% uptime (Vercel + Supabase SLA alignment)

### 3.2 Product KPIs

| Metric | Target (90 days post-launch) |
|---|---|
| Opportunity fill rate | ≥ 75% |
| Median time-to-shortlist | < 4 hours |
| Freelancer response rate (WhatsApp) | ≥ 60% |
| On-time project delivery | ≥ 85% |
| Payment dispute rate | < 2% |
| Weekly active talent managers | ≥ 80% of seats |

---

## 4. User Personas

### 4.1 Admin (Agency Owner / Operations Lead)

- **Goals:** Configure agency, manage billing, oversee all projects and payments, view analytics
- **Pain:** No single dashboard for agency health
- **Permissions:** Full tenant access, user management, billing, integrations

### 4.2 Talent Manager (Producer / Resource Manager)

- **Goals:** Maintain talent roster, broadcast opportunities, shortlist, assign projects, track delivery
- **Pain:** Chasing freelancers across channels
- **Permissions:** CRUD on talent, opportunities, projects; read payments; no billing

### 4.3 Freelancer (Creative Contractor)

- **Goals:** Receive relevant opportunities, accept/decline, submit work, track payment status
- **Pain:** Missed gigs, unclear payment timelines
- **Permissions:** Own profile, respond to opportunities, view assigned projects and payments

---

## 5. Scope

### 5.1 In Scope (MVP)

| Module | Description |
|---|---|
| **Talent Database** | Profiles, skills, rates, availability, portfolio links, tags, ratings |
| **Opportunity Broadcasting** | Create gigs, match talent, broadcast via in-app + WhatsApp |
| **Shortlisting** | Manager curates candidates; scoring and notes |
| **Project Assignment** | Convert shortlist to active project with milestones |
| **Status Tracking** | Kanban + timeline; milestone approvals; notifications |
| **Payments** | Invoice generation, approval workflow, status tracking (Stripe Connect ready) |
| **Analytics** | Dashboards: fill rate, utilization, revenue, payment aging |
| **Multi-tenancy** | Isolated agency workspaces with RLS |
| **Auth** | Email/password, magic link, role-based access |
| **Integrations** | n8n orchestration, WhatsApp Cloud API |

### 5.2 Out of Scope (MVP)

- Native mobile apps (responsive web only)
- Full accounting/ERP integration (export CSV only)
- AI-powered talent matching (Phase 2)
- Client-facing portals (Phase 2)
- Contract e-signature (Phase 2)

---

## 6. Functional Requirements

### 6.1 Talent Database

| ID | Requirement | Priority |
|---|---|---|
| T-001 | CRUD freelancer profiles with skills, day rate, currency, timezone | P0 |
| T-002 | Tag talent by discipline (design, video, copy, etc.) | P0 |
| T-003 | Availability calendar (available / busy / unavailable) | P1 |
| T-004 | Portfolio links and file attachments (Supabase Storage) | P1 |
| T-005 | Internal ratings and notes (manager-only) | P0 |
| T-006 | Bulk import via CSV | P2 |
| T-007 | Search and filter by skill, rate, availability, rating | P0 |

### 6.2 Opportunity Broadcasting

| ID | Requirement | Priority |
|---|---|---|
| O-001 | Create opportunity with title, brief, budget, deadline, required skills | P0 |
| O-002 | Auto-suggest matching talent based on skills and availability | P1 |
| O-003 | Broadcast to selected talent via in-app notification + WhatsApp | P0 |
| O-004 | Track responses: interested / declined / no response | P0 |
| O-005 | Set response deadline with auto-close | P1 |
| O-006 | Opportunity templates for recurring gig types | P2 |

### 6.3 Shortlisting

| ID | Requirement | Priority |
|---|---|---|
| S-001 | Add responded freelancers to shortlist with rank and notes | P0 |
| S-002 | Share shortlist view (read-only) with Admin | P1 |
| S-003 | Compare candidates side-by-side (rate, rating, response time) | P1 |
| S-004 | Reject candidates with reason (internal) | P0 |

### 6.4 Project Assignment

| ID | Requirement | Priority |
|---|---|---|
| P-001 | Convert shortlisted candidate to assigned project | P0 |
| P-002 | Define milestones with due dates and deliverables | P0 |
| P-003 | Assign primary and backup talent | P1 |
| P-004 | Link project to client name and internal cost center | P1 |
| P-005 | Auto-notify assigned freelancer via WhatsApp + email | P0 |

### 6.5 Status Tracking

| ID | Requirement | Priority |
|---|---|---|
| ST-001 | Project statuses: draft → active → in_review → completed → archived | P0 |
| ST-002 | Milestone statuses: pending → in_progress → submitted → approved / revision | P0 |
| ST-003 | Activity log (audit trail) per project | P0 |
| ST-004 | Freelancer can upload deliverables per milestone | P0 |
| ST-005 | Manager can request revision with comments | P0 |
| ST-006 | Overdue alerts via n8n (WhatsApp + email) | P1 |

### 6.6 Payments

| ID | Requirement | Priority |
|---|---|---|
| PY-001 | Generate payment record on project/milestone completion | P0 |
| PY-002 | Payment statuses: pending → approved → processing → paid → disputed | P0 |
| PY-003 | Admin approval workflow before payout | P0 |
| PY-004 | Payment history per freelancer | P0 |
| PY-005 | Export payments to CSV | P1 |
| PY-006 | Stripe Connect integration hooks (Phase 1.5) | P2 |

### 6.7 Analytics

| ID | Requirement | Priority |
|---|---|---|
| A-001 | Dashboard: active projects, open opportunities, pending payments | P0 |
| A-002 | Fill rate by opportunity type and time period | P0 |
| A-003 | Talent utilization (projects per freelancer) | P1 |
| A-004 | Average time-to-fill and time-to-pay | P1 |
| A-005 | Revenue/cost summary by client and discipline | P1 |
| A-006 | Export reports as CSV | P2 |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Page load < 2s (P95); API response < 500ms (P95) |
| **Security** | Row-Level Security on all tenant data; encrypted at rest (Supabase) |
| **Scalability** | 500 tenants, 50k freelancers platform-wide |
| **Availability** | 99.5% uptime target |
| **Compliance** | GDPR-ready: data export, deletion, consent tracking |
| **Accessibility** | WCAG 2.1 AA for core flows |
| **Localization** | English MVP; i18n-ready architecture |

---

## 8. System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        CREATIVE AGENCY                          │
│  ┌──────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │  Admin   │  │ Talent Manager  │  │     Freelancers      │   │
│  └────┬─────┘  └────────┬────────┘  └──────────┬───────────┘   │
└───────┼─────────────────┼──────────────────────┼─────────────┘
        │                 │                          │
        ▼                 ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Talent OS (Next.js on Vercel)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Web App    │  │  API Routes  │  │  Server Actions / RSC  │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘ │
└─────────┼────────────────┼──────────────────────┼──────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────────────┐
│    Supabase     │ │     n8n      │ │  WhatsApp Cloud API      │
│  Auth + DB +    │ │  Workflows   │ │  (Meta Business)         │
│  Storage + RT   │ │  Automation  │ │  Messaging               │
└─────────────────┘ └──────────────┘ └──────────────────────────┘
```

---

## 9. Release Plan

### Phase 1 — MVP (Weeks 1–8)

- Multi-tenant auth and onboarding
- Talent database + search
- Opportunity create/broadcast/respond
- Shortlisting and project assignment
- Basic status tracking
- Payment records (manual approval)
- Core analytics dashboard
- WhatsApp opportunity notifications
- n8n: broadcast, reminders, payment alerts

### Phase 2 — Growth (Weeks 9–14)

- Stripe Connect payouts
- AI-assisted talent matching
- Advanced analytics and exports
- Opportunity templates
- Client portal (read-only project status)

### Phase 3 — Scale (Weeks 15+)

- API for third-party integrations
- White-label options
- Multi-currency and multi-region
- Mobile PWA enhancements

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WhatsApp API policy changes | Medium | High | Abstract messaging layer; support SMS fallback |
| Freelancer adoption (no login) | High | Medium | WhatsApp-first flows; magic link onboarding |
| Multi-tenant data leakage | Low | Critical | RLS + automated security tests |
| n8n single point of failure | Medium | Medium | Queue retries; dead-letter workflows |
| Payment compliance | Medium | High | Stripe Connect; legal review before launch |

---

## 11. Open Questions

1. Should freelancers belong to multiple agencies (network model) or one agency per profile?
   - **Recommendation:** One profile per agency for MVP; global freelancer identity in Phase 2.
2. Fixed-price vs. time-and-materials billing?
   - **Recommendation:** Support both; milestone amount is explicit field.
3. Who pays for WhatsApp message costs — platform or tenant?
   - **Recommendation:** Pass-through to tenant; track usage in analytics.

---

## 12. Appendix: Glossary

| Term | Definition |
|---|---|
| **Tenant** | A single creative agency workspace |
| **Opportunity** | An open gig broadcast to talent |
| **Shortlist** | Curated list of candidates for an opportunity |
| **Project** | An assigned engagement with milestones |
| **Milestone** | A deliverable checkpoint within a project |
| **Fill rate** | % of opportunities that result in assignment |
