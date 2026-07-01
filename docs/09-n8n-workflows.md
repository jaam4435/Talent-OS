# Talent OS — n8n Workflow Specifications

**Orchestrator:** n8n (self-hosted or n8n Cloud)  
**Trigger sources:** Supabase Database Webhooks, Cron, API calls from Next.js  
**Pattern:** Event-driven with per-tenant webhook routing

---

## 1. n8n Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Talent OS (Next.js)                      │
│                                                                 │
│  Server Action / API Route                                        │
│       │                                                         │
│       ▼                                                         │
│  dispatchN8nEvent(tenant_id, event, payload)                    │
└───────┬─────────────────────────────────────────────────────────┘
        │ POST /webhook/{event}
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         n8n Instance                            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Webhook    │  │    Switch    │  │   Action Nodes       │  │
│  │   Trigger    │─▶│  (by event)  │─▶│  WhatsApp / Email /  │  │
│  │              │  │              │  │  Supabase / HTTP     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌──────────────┐                                               │
│  │  Cron Trigger │──▶ Overdue checks, expiry, cleanup           │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  WhatsApp    │  │   Resend /   │  │   Supabase   │
│  Cloud API   │  │   SendGrid   │  │  (service    │
│              │  │              │  │   role)      │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 2. Event Contract

All events dispatched from Talent OS follow this schema:

```typescript
interface N8nEventPayload {
  event: string
  tenant_id: string
  timestamp: string       // ISO 8601
  actor_id?: string       // User who triggered (if applicable)
  data: Record<string, unknown>
}
```

### Dispatch Function

```typescript
// lib/integrations/n8n.ts
export async function dispatchN8nEvent(
  tenantId: string,
  event: string,
  data: Record<string, unknown>,
  actorId?: string
) {
  const config = await getIntegrationConfig(tenantId, 'n8n')
  if (!config?.is_active) return

  const webhookUrl = `${config.webhook_base_url}/${event}`
  const payload: N8nEventPayload = {
    event,
    tenant_id: tenantId,
    timestamp: new Date().toISOString(),
    actor_id: actorId,
    data,
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signPayload(payload, config.api_key),
    },
    body: JSON.stringify(payload),
  })
}
```

---

## 3. Workflow Catalog

### WF-01: Tenant Created (Welcome)

| Property | Value |
|---|---|
| **Trigger** | Webhook: `tenant.created` |
| **Source** | `signUpAgency()` server action |
| **Priority** | P0 |

**Flow:**
```
Webhook → Get tenant details (Supabase) → Send welcome email → Log activity
```

**Input Data:**
```json
{
  "event": "tenant.created",
  "tenant_id": "uuid",
  "data": {
    "admin_email": "admin@agency.com",
    "admin_name": "Jane Doe",
    "agency_name": "Acme Creative",
    "slug": "acme-creative"
  }
}
```

**Actions:**
1. Send welcome email with getting-started guide
2. Create onboarding checklist notification in app

---

### WF-02: Opportunity Broadcast

| Property | Value |
|---|---|
| **Trigger** | Webhook: `opportunity.broadcast` |
| **Source** | `broadcastOpportunity()` server action |
| **Priority** | P0 |

**Flow:**
```
Webhook → Split recipients → For each:
  ├── Create in-app notification (Supabase)
  ├── Send WhatsApp template message
  ├── Update opportunity_recipients.whatsapp_sent_at
  └── Log to whatsapp_messages
→ Summary notification to manager
```

**Input Data:**
```json
{
  "event": "opportunity.broadcast",
  "tenant_id": "uuid",
  "data": {
    "opportunity_id": "uuid",
    "title": "Brand Video Editor Needed",
    "budget": 2500,
    "currency": "USD",
    "response_deadline": "2026-07-05T18:00:00Z",
    "recipients": [
      {
        "freelancer_id": "uuid",
        "full_name": "Alex Chen",
        "phone": "+14155551234",
        "recipient_id": "uuid"
      }
    ]
  }
}
```

**WhatsApp Template:** `opportunity_alert`
```
Hi {{1}}, new opportunity at {{2}}!

📋 {{3}}
💰 Budget: {{4}} {{5}}
⏰ Respond by: {{6}}

Reply YES to express interest or tap to view details:
{{7}}
```

**Error Handling:**
- WhatsApp send failure → retry 3x with exponential backoff
- After 3 failures → mark `whatsapp_delivered: false`, alert manager
- Invalid phone → skip, log warning

---

### WF-03: Opportunity Response Notification

| Property | Value |
|---|---|
| **Trigger** | Webhook: `opportunity.response` |
| **Source** | DB trigger on `opportunity_recipients` update |
| **Priority** | P0 |

**Flow:**
```
Webhook → Get opportunity + freelancer details → Notify manager (in-app + email)
```

**Input Data:**
```json
{
  "event": "opportunity.response",
  "data": {
    "opportunity_id": "uuid",
    "freelancer_name": "Alex Chen",
    "response": "interested",
    "response_note": "Available next week",
    "manager_id": "uuid"
  }
}
```

---

### WF-04: Project Assigned

| Property | Value |
|---|---|
| **Trigger** | Webhook: `project.assigned` |
| **Source** | DB trigger on `projects` insert |
| **Priority** | P0 |

**Flow:**
```
Webhook → Get project + milestone details →
  ├── In-app notification to freelancer
  ├── WhatsApp message to freelancer
  └── Email confirmation to manager
```

**WhatsApp Template:** `project_assigned`
```
🎉 You've been assigned to a new project!

Project: {{1}}
Client: {{2}}
First milestone due: {{3}}

View project: {{4}}
```

---

### WF-05: Milestone Submitted

| Property | Value |
|---|---|
| **Trigger** | Webhook: `milestone.submitted` |
| **Source** | `submitMilestone()` server action |
| **Priority** | P0 |

**Flow:**
```
Webhook → Notify project manager (in-app + email) → Update project status to in_review
```

---

### WF-06: Milestone Approved → Payment Created

| Property | Value |
|---|---|
| **Trigger** | Webhook: `milestone.approved` |
| **Source** | DB trigger (payment auto-created) |
| **Priority** | P0 |

**Flow:**
```
Webhook → Notify admin(s) of pending payment →
  WhatsApp to freelancer: "Your deliverable was approved!"
```

---

### WF-07: Payment Notifications

| Property | Value |
|---|---|
| **Trigger** | Webhook: `payment.pending` / `payment.approved` / `payment.paid` |
| **Source** | Payment status changes |
| **Priority** | P0 |

**Flows:**

**payment.pending** → Notify all admins
```
Subject: Payment approval needed — {{amount}} {{currency}} for {{freelancer_name}}
```

**payment.approved** → Notify freelancer
```
WhatsApp: Your payment of {{amount}} {{currency}} has been approved and is being processed.
```

**payment.paid** → Notify freelancer
```
WhatsApp: 💰 Payment of {{amount}} {{currency}} has been sent! Ref: {{reference}}
```

---

### WF-08: Overdue Milestone Reminders (Cron)

| Property | Value |
|---|---|
| **Trigger** | Cron: daily at 09:00 UTC |
| **Priority** | P1 |

**Flow:**
```
Cron → Query Supabase: milestones WHERE due_date < today AND status NOT IN (approved, canceled)
  → For each overdue:
    ├── Day 1: WhatsApp to freelancer + email to manager
    ├── Day 2: WhatsApp reminder to freelancer
    └── Day 3+: Escalate to admin
  → Log all notifications sent
```

**Supabase Query (via n8n HTTP node):**
```sql
SELECT m.*, p.title AS project_title, p.assigned_by,
       f.full_name, f.phone, f.user_id
FROM milestones m
JOIN projects p ON p.id = m.project_id
JOIN freelancers f ON f.id = p.freelancer_id
WHERE m.due_date < CURRENT_DATE
  AND m.status NOT IN ('approved', 'canceled')
  AND m.tenant_id = $1
```

---

### WF-09: Opportunity Expiry (Cron)

| Property | Value |
|---|---|
| **Trigger** | Cron: every hour |
| **Priority** | P1 |

**Flow:**
```
Cron → Query: opportunities WHERE response_deadline < now() AND status = 'open'
  → For each:
    ├── Update status to 'closed'
    ├── Notify manager
    └── If zero responses: flag as "no responses" alert
```

---

### WF-10: WhatsApp Inbound Handler

| Property | Value |
|---|---|
| **Trigger** | Webhook: `whatsapp.inbound` (from Meta → Next.js → n8n) |
| **Priority** | P1 |

**Flow:**
```
Webhook → Parse message body →
  Switch:
    ├── "YES" / "INTERESTED" → Update opportunity_recipients.response = 'interested'
    ├── "NO" / "DECLINE" → Update opportunity_recipients.response = 'declined'
    ├── Default → Log message, notify manager of unrecognized reply
  → Send confirmation WhatsApp back
```

**Input Data:**
```json
{
  "event": "whatsapp.inbound",
  "data": {
    "phone": "+14155551234",
    "body": "YES",
    "wa_message_id": "wamid.xxx",
    "context": {
      "opportunity_id": "uuid",
      "recipient_id": "uuid"
    }
  }
}
```

---

### WF-11: Team Invite

| Property | Value |
|---|---|
| **Trigger** | Webhook: `member.invited` |
| **Source** | `inviteTeamMember()` server action |
| **Priority** | P0 |

**Flow:**
```
Webhook → Send invite email with magic link → Log sent
```

**Email Template:**
```
Subject: You've been invited to {{agency_name}} on Talent OS

Hi,

{{inviter_name}} has invited you to join {{agency_name}} as a {{role}}.

Accept invitation: {{invite_url}}
(Link expires in 7 days)
```

---

### WF-12: Notification Cleanup (Cron)

| Property | Value |
|---|---|
| **Trigger** | Cron: weekly (Sunday 02:00 UTC) |
| **Priority** | P2 |

**Flow:**
```
Cron → DELETE FROM notifications WHERE read_at IS NOT NULL AND read_at < now() - interval '90 days'
     → DELETE FROM whatsapp_messages WHERE created_at < now() - interval '2 years'
```

---

## 4. n8n Node Configuration

### 4.1 Supabase Node (Service Role)

```json
{
  "host": "{{ $env.SUPABASE_URL }}",
  "serviceRole": "{{ $env.SUPABASE_SERVICE_ROLE_KEY }}",
  "operation": "executeQuery",
  "query": "SELECT * FROM freelancers WHERE tenant_id = $1 AND phone = $2",
  "parameters": ["{{ $json.tenant_id }}", "{{ $json.data.phone }}"]
}
```

### 4.2 WhatsApp HTTP Node

```json
{
  "method": "POST",
  "url": "https://graph.facebook.com/v21.0/{{ $json.phone_number_id }}/messages",
  "headers": {
    "Authorization": "Bearer {{ $json.access_token }}",
    "Content-Type": "application/json"
  },
  "body": {
    "messaging_product": "whatsapp",
    "to": "{{ $json.phone }}",
    "type": "template",
    "template": {
      "name": "{{ $json.template_name }}",
      "language": { "code": "en" },
      "components": [
        {
          "type": "body",
          "parameters": "{{ $json.template_params }}"
        }
      ]
    }
  }
}
```

### 4.3 Error Handling Pattern

Every workflow includes:

```
Try → Main flow
Catch → 
  ├── Log error to Supabase (activity_logs)
  ├── Retry (max 3, exponential backoff) for transient errors
  └── Dead letter: store failed event for manual review
```

---

## 5. Workflow Files

Export workflows as JSON to `n8n/` directory for version control:

```
n8n/
├── wf-01-tenant-created.json
├── wf-02-opportunity-broadcast.json
├── wf-03-opportunity-response.json
├── wf-04-project-assigned.json
├── wf-05-milestone-submitted.json
├── wf-06-milestone-approved.json
├── wf-07-payment-notifications.json
├── wf-08-overdue-reminders.json
├── wf-09-opportunity-expiry.json
├── wf-10-whatsapp-inbound.json
├── wf-11-team-invite.json
└── wf-12-notification-cleanup.json
```

---

## 6. Deployment & Environment

### n8n Environment Variables

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WHATSAPP_DEFAULT_PHONE_NUMBER_ID=123456789
N8N_WEBHOOK_SECRET=shared-hmac-secret
RESEND_API_KEY=re_...
```

### Per-Tenant Configuration

Stored in `integration_configs` table, fetched at workflow start:

```javascript
// n8n Function node — fetch tenant config
const tenantId = $input.first().json.tenant_id;
const response = await $helpers.httpRequest({
  method: 'GET',
  url: `${$env.SUPABASE_URL}/rest/v1/integration_configs?tenant_id=eq.${tenantId}&provider=eq.whatsapp`,
  headers: {
    'apikey': $env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${$env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
});
return response[0]?.config || {};
```

---

## 7. Monitoring & Observability

| Metric | Source | Alert Threshold |
|---|---|---|
| Workflow execution failures | n8n execution log | > 5 in 1 hour |
| WhatsApp delivery rate | `whatsapp_messages.status` | < 90% delivered |
| Average workflow duration | n8n metrics | > 30 seconds |
| Dead letter queue size | Failed events table | > 10 pending |
| Cron job last run | n8n execution history | > 25 hours since last run |

---

## 8. Testing Strategy

| Test | Method |
|---|---|
| Webhook receipt | Postman/curl to n8n webhook URL with sample payload |
| WhatsApp delivery | Send to test phone number in Meta sandbox |
| Cron workflows | Manual trigger in n8n UI |
| Error paths | Send malformed payload; verify dead letter |
| End-to-end | Create opportunity in staging → verify WhatsApp received |
