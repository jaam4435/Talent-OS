# Talent OS — User Stories

**Format:** As a [role], I want [action], so that [benefit].  
**Priority:** P0 (MVP) · P1 (Post-MVP) · P2 (Future)

---

## Epic 1: Tenant Onboarding & Administration

### US-1.1 — Agency Registration
**As an** Admin, **I want to** register my agency and create a workspace, **so that** my team can start using Talent OS immediately.

**Acceptance Criteria:**
- [ ] Admin signs up with email and agency name
- [ ] Unique subdomain/slug generated (e.g., `acme-creative`)
- [ ] Default roles seeded: Admin, Talent Manager
- [ ] Welcome email sent via n8n
- [ ] 14-day trial started automatically

**Priority:** P0 · **Points:** 5

---

### US-1.2 — Invite Team Members
**As an** Admin, **I want to** invite Talent Managers by email, **so that** they can access the platform with appropriate permissions.

**Acceptance Criteria:**
- [ ] Invite link expires in 7 days
- [ ] Invitee selects password or uses magic link
- [ ] Role assigned on acceptance (Talent Manager)
- [ ] Admin can revoke pending invites

**Priority:** P0 · **Points:** 3

---

### US-1.3 — Agency Settings
**As an** Admin, **I want to** configure agency branding, timezone, and default currency, **so that** all records reflect our operational context.

**Acceptance Criteria:**
- [ ] Logo upload to Supabase Storage
- [ ] Timezone and currency saved to tenant settings
- [ ] Changes reflected in dashboards and exports

**Priority:** P1 · **Points:** 2

---

### US-1.4 — Integration Configuration
**As an** Admin, **I want to** connect WhatsApp Business and n8n webhooks, **so that** automated notifications work for my agency.

**Acceptance Criteria:**
- [ ] WhatsApp phone number ID and access token stored securely (encrypted)
- [ ] Test message sends successfully
- [ ] n8n webhook URL registered per tenant
- [ ] Connection status visible in settings

**Priority:** P0 · **Points:** 5

---

## Epic 2: Talent Database

### US-2.1 — Add Freelancer Profile
**As a** Talent Manager, **I want to** create a freelancer profile with skills, rates, and contact info, **so that** I can match them to opportunities.

**Acceptance Criteria:**
- [ ] Required fields: name, email, primary discipline, day rate
- [ ] Optional: phone (WhatsApp), portfolio URL, bio, tags
- [ ] Profile scoped to current tenant
- [ ] Duplicate email warning within tenant

**Priority:** P0 · **Points:** 3

---

### US-2.2 — Search & Filter Talent
**As a** Talent Manager, **I want to** search freelancers by skill, rate range, and availability, **so that** I can quickly find the right person.

**Acceptance Criteria:**
- [ ] Full-text search on name and skills
- [ ] Filters: discipline, rate min/max, availability, rating
- [ ] Results paginated (20 per page)
- [ ] Sort by rating, rate, last active

**Priority:** P0 · **Points:** 5

---

### US-2.3 — Freelancer Self-Service Profile
**As a** Freelancer, **I want to** view and update my own profile, **so that** my information stays current.

**Acceptance Criteria:**
- [ ] Freelancer can edit: bio, portfolio, skills, availability
- [ ] Freelancer cannot edit: internal rating, manager notes
- [ ] Changes logged in activity feed

**Priority:** P0 · **Points:** 3

---

### US-2.4 — Internal Notes & Ratings
**As a** Talent Manager, **I want to** add private notes and ratings to freelancer profiles, **so that** my team has context for future assignments.

**Acceptance Criteria:**
- [ ] Rating 1–5 stars
- [ ] Notes visible only to Admin and Talent Managers
- [ ] Rating history preserved

**Priority:** P0 · **Points:** 2

---

### US-2.5 — Bulk Import Talent
**As a** Talent Manager, **I want to** import freelancers from CSV, **so that** I can migrate our existing roster quickly.

**Acceptance Criteria:**
- [ ] CSV template downloadable
- [ ] Validation errors reported per row
- [ ] Duplicate handling: skip or update
- [ ] Import summary shown on completion

**Priority:** P2 · **Points:** 5

---

## Epic 3: Opportunity Broadcasting

### US-3.1 — Create Opportunity
**As a** Talent Manager, **I want to** create an opportunity with brief, budget, and required skills, **so that** I can find talent for a client need.

**Acceptance Criteria:**
- [ ] Fields: title, description, budget, currency, deadline, skills[], response_deadline
- [ ] Status: draft → open → closed → filled
- [ ] Save as draft before broadcasting

**Priority:** P0 · **Points:** 3

---

### US-3.2 — Broadcast Opportunity
**As a** Talent Manager, **I want to** send an opportunity to selected freelancers via app and WhatsApp, **so that** I maximize response rate.

**Acceptance Criteria:**
- [ ] Select talent manually or from suggested matches
- [ ] In-app notification created immediately
- [ ] WhatsApp message sent via n8n workflow
- [ ] Broadcast log with delivery status per recipient

**Priority:** P0 · **Points:** 8

---

### US-3.3 — Respond to Opportunity
**As a** Freelancer, **I want to** view opportunity details and respond interested or declined, **so that** the manager knows my availability.

**Acceptance Criteria:**
- [ ] Freelancer sees only opportunities sent to them
- [ ] Response options: interested, declined (with optional note)
- [ ] Response timestamp recorded
- [ ] Manager notified of new response

**Priority:** P0 · **Points:** 5

---

### US-3.4 — WhatsApp Quick Response
**As a** Freelancer, **I want to** reply to opportunity WhatsApp messages with quick actions, **so that** I can respond without logging in.

**Acceptance Criteria:**
- [ ] WhatsApp message includes deep link to respond
- [ ] Reply keywords (YES/NO) parsed by n8n webhook
- [ ] Response synced to database
- [ ] Confirmation message sent back

**Priority:** P1 · **Points:** 8

---

### US-3.5 — Auto-Close Expired Opportunities
**As a** Talent Manager, **I want** opportunities to auto-close after the response deadline, **so that** stale gigs don't clutter the pipeline.

**Acceptance Criteria:**
- [ ] n8n cron checks response_deadline daily
- [ ] Status updated to `closed`
- [ ] Manager notified if zero responses

**Priority:** P1 · **Points:** 3

---

## Epic 4: Shortlisting

### US-4.1 — Build Shortlist
**As a** Talent Manager, **I want to** add interested freelancers to a shortlist with rank and notes, **so that** I can compare candidates efficiently.

**Acceptance Criteria:**
- [ ] Add from opportunity responses
- [ ] Rank order (drag-and-drop)
- [ ] Per-candidate notes
- [ ] Shortlist linked to parent opportunity

**Priority:** P0 · **Points:** 5

---

### US-4.2 — Compare Candidates
**As a** Talent Manager, **I want to** see a side-by-side comparison of shortlisted freelancers, **so that** I can make an informed assignment decision.

**Acceptance Criteria:**
- [ ] Display: name, rate, rating, response time, notes
- [ ] Highlight recommended pick
- [ ] Export shortlist as PDF (P2)

**Priority:** P1 · **Points:** 3

---

### US-4.3 — Reject Candidate
**As a** Talent Manager, **I want to** remove a candidate from the shortlist with a reason, **so that** we maintain audit history.

**Acceptance Criteria:**
- [ ] Rejection reason required (dropdown + free text)
- [ ] Candidate status: rejected
- [ ] Optional notification to freelancer (configurable)

**Priority:** P0 · **Points:** 2

---

## Epic 5: Project Assignment

### US-5.1 — Assign Project from Shortlist
**As a** Talent Manager, **I want to** convert a shortlisted freelancer into an active project, **so that** work can begin with clear expectations.

**Acceptance Criteria:**
- [ ] Select freelancer from shortlist
- [ ] Project inherits opportunity title, brief, budget
- [ ] Opportunity status → `filled`
- [ ] Other shortlist candidates marked not selected

**Priority:** P0 · **Points:** 5

---

### US-5.2 — Define Milestones
**As a** Talent Manager, **I want to** add milestones with due dates and amounts, **so that** delivery and payments are structured.

**Acceptance Criteria:**
- [ ] Milestone: title, description, due_date, amount
- [ ] Sum of milestone amounts ≤ project budget
- [ ] At least one milestone required

**Priority:** P0 · **Points:** 3

---

### US-5.3 — Notify Assigned Freelancer
**As a** Freelancer, **I want to** receive a notification when assigned to a project, **so that** I know to start work.

**Acceptance Criteria:**
- [ ] In-app + WhatsApp notification
- [ ] Message includes project title, first milestone due date
- [ ] Link to project detail page

**Priority:** P0 · **Points:** 3

---

## Epic 6: Status Tracking

### US-6.1 — Project Kanban View
**As a** Talent Manager, **I want to** see all projects on a Kanban board by status, **so that** I have a visual pipeline overview.

**Acceptance Criteria:**
- [ ] Columns: draft, active, in_review, completed, archived
- [ ] Drag to change status (with validation)
- [ ] Filter by client, freelancer, date range

**Priority:** P0 · **Points:** 5

---

### US-6.2 — Submit Milestone Deliverable
**As a** Freelancer, **I want to** upload files and mark a milestone as submitted, **so that** the manager can review my work.

**Acceptance Criteria:**
- [ ] File upload to Supabase Storage (max 50MB)
- [ ] Optional submission note
- [ ] Milestone status → `submitted`
- [ ] Manager notified

**Priority:** P0 · **Points:** 5

---

### US-6.3 — Review & Approve Milestone
**As a** Talent Manager, **I want to** approve or request revision on submitted milestones, **so that** quality is ensured before payment.

**Acceptance Criteria:**
- [ ] Approve → milestone status `approved`; triggers payment record
- [ ] Request revision → status `revision`; comment required
- [ ] Freelancer notified of decision

**Priority:** P0 · **Points:** 5

---

### US-6.4 — Activity Log
**As an** Admin, **I want to** view a full audit trail per project, **so that** I can resolve disputes and understand history.

**Acceptance Criteria:**
- [ ] Log: actor, action, timestamp, metadata
- [ ] Immutable records
- [ ] Filterable by action type

**Priority:** P0 · **Points:** 3

---

### US-6.5 — Overdue Alerts
**As a** Talent Manager, **I want to** receive alerts when milestones are overdue, **so that** I can intervene before client impact.

**Acceptance Criteria:**
- [ ] n8n daily job checks due_date < today AND status not approved
- [ ] WhatsApp + email to assigned manager
- [ ] Escalation to Admin after 48h overdue

**Priority:** P1 · **Points:** 5

---

## Epic 7: Payments

### US-7.1 — Auto-Generate Payment on Approval
**As a** Talent Manager, **I want** a payment record created when I approve a milestone, **so that** payouts are tracked automatically.

**Acceptance Criteria:**
- [ ] Payment amount = milestone amount
- [ ] Status: `pending`
- [ ] Linked to project, milestone, freelancer

**Priority:** P0 · **Points:** 3

---

### US-7.2 — Approve Payment for Payout
**As an** Admin, **I want to** review and approve pending payments, **so that** funds are released with proper oversight.

**Acceptance Criteria:**
- [ ] List pending payments with project context
- [ ] Approve → status `approved`
- [ ] Reject → status `disputed` with reason
- [ ] Freelancer notified on status change

**Priority:** P0 · **Points:** 5

---

### US-7.3 — Mark Payment as Paid
**As an** Admin, **I want to** mark approved payments as paid with reference number, **so that** records reflect actual disbursement.

**Acceptance Criteria:**
- [ ] Fields: paid_at, payment_reference (bank/Stripe ID)
- [ ] Status → `paid`
- [ ] Visible in freelancer payment history

**Priority:** P0 · **Points:** 2

---

### US-7.4 — Freelancer Payment History
**As a** Freelancer, **I want to** view my payment history and pending amounts, **so that** I know what to expect.

**Acceptance Criteria:**
- [ ] List: project, milestone, amount, status, dates
- [ ] Summary: total earned, pending, paid this month
- [ ] Filter by status and date range

**Priority:** P0 · **Points:** 3

---

### US-7.5 — Export Payments
**As an** Admin, **I want to** export payments to CSV, **so that** I can reconcile with accounting.

**Acceptance Criteria:**
- [ ] Filter by date range and status
- [ ] Columns: freelancer, project, amount, status, dates, reference
- [ ] Download from dashboard

**Priority:** P1 · **Points:** 2

---

## Epic 8: Analytics

### US-8.1 — Operations Dashboard
**As an** Admin, **I want to** see key metrics on a dashboard, **so that** I understand agency health at a glance.

**Acceptance Criteria:**
- [ ] Cards: active projects, open opportunities, pending payments, total freelancers
- [ ] Trend vs. previous 30 days
- [ ] Data scoped to tenant

**Priority:** P0 · **Points:** 5

---

### US-8.2 — Fill Rate Report
**As a** Talent Manager, **I want to** see opportunity fill rate over time, **so that** I can improve broadcasting strategy.

**Acceptance Criteria:**
- [ ] Chart: fill rate % by week/month
- [ ] Breakdown by discipline
- [ ] Filter by date range

**Priority:** P0 · **Points:** 3

---

### US-8.3 — Talent Utilization Report
**As an** Admin, **I want to** see which freelancers are most/least utilized, **so that** I can balance the roster.

**Acceptance Criteria:**
- [ ] Table: freelancer, projects count, total revenue, avg rating
- [ ] Sort by utilization
- [ ] Identify inactive talent (0 projects in 90 days)

**Priority:** P1 · **Points:** 3

---

### US-8.4 — Payment Aging Report
**As an** Admin, **I want to** see how long payments sit in each status, **so that** I can improve cash flow.

**Acceptance Criteria:**
- [ ] Average days: pending → approved → paid
- [ ] List payments overdue for approval (> 7 days pending)
- [ ] Total outstanding amount

**Priority:** P1 · **Points:** 3

---

## Epic 9: Authentication & Security

### US-9.1 — Role-Based Access
**As a** platform operator, **I want** each role to access only permitted resources, **so that** data is protected.

**Acceptance Criteria:**
- [ ] Admin: full tenant access
- [ ] Talent Manager: no billing, no user management
- [ ] Freelancer: own data + assigned projects/opportunities only
- [ ] Enforced via Supabase RLS and API middleware

**Priority:** P0 · **Points:** 8

---

### US-9.2 — Freelancer Magic Link Onboarding
**As a** Freelancer, **I want to** access the platform via a magic link sent to my email/WhatsApp, **so that** I don't need to remember a password.

**Acceptance Criteria:**
- [ ] Magic link valid 24 hours
- [ ] First login completes profile setup
- [ ] Session persists 30 days

**Priority:** P0 · **Points:** 5

---

## Story Map Summary

| Epic | P0 Stories | P1 Stories | P2 Stories |
|---|---|---|---|
| Onboarding & Admin | 3 | 1 | 0 |
| Talent Database | 4 | 0 | 1 |
| Opportunity Broadcasting | 3 | 2 | 0 |
| Shortlisting | 2 | 1 | 0 |
| Project Assignment | 3 | 0 | 0 |
| Status Tracking | 4 | 1 | 0 |
| Payments | 4 | 1 | 0 |
| Analytics | 2 | 2 | 0 |
| Auth & Security | 2 | 0 | 0 |
| **Total** | **27** | **8** | **1** |

**MVP Velocity Estimate:** 36 stories · ~130 story points
