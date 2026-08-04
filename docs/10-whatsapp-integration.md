# Talent OS — WhatsApp Integration Design

**API:** WhatsApp Cloud API (Meta Business Platform)  
**Version:** v21.0  
**Pattern:** Template messages (outbound) + Webhook (inbound)

---

## 1. Integration Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Talent OS Application                        │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │  Broadcast  │───▶│  n8n Workflow │───▶│  WhatsApp Cloud   │  │
│  │  Action     │    │  (WF-02)     │    │  API              │  │
│  └─────────────┘    └──────────────┘    └────────┬──────────┘  │
│                                                  │              │
│  ┌─────────────┐    ┌──────────────┐             │              │
│  │  Webhook    │◀───│  n8n Workflow │◀────────────┘              │
│  │  Handler    │    │  (WF-10)     │    Meta Webhook             │
│  └──────┬──────┘    └──────────────┘                            │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐                                                │
│  │  Supabase   │  opportunity_recipients, whatsapp_messages      │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites & Setup

### 2.1 Meta Business Requirements

| Requirement | Details |
|---|---|
| Meta Business Account | Verified business |
| WhatsApp Business Account (WABA) | Linked to Meta Business |
| Phone Number | Dedicated business number (not personal) |
| App Review | Template messages pre-approved by Meta |
| Webhook URL | HTTPS endpoint for inbound messages |

### 2.2 Per-Tenant Setup Flow

```
Admin → Settings → Integrations → WhatsApp
  1. Enter Phone Number ID (from Meta Business Manager)
  2. Enter WhatsApp Business Account ID
  3. Enter Permanent Access Token (System User token)
  4. Click "Test Connection" → sends test template to admin phone
  5. On success → config saved (encrypted) in integration_configs
```

### 2.3 Credential Storage

```typescript
// Encrypted in integration_configs.config
interface WhatsAppConfig {
  phone_number_id: string       // e.g., "123456789012345"
  business_account_id: string   // WABA ID
  access_token: string          // System User permanent token
  verify_token: string          // Webhook verification token
  webhook_url?: string          // Auto-configured
}

// lib/integrations/encryption.ts
export function encryptConfig(config: WhatsAppConfig): string {
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv)
  return cipher.update(JSON.stringify(config), 'utf8', 'hex') + cipher.final('hex')
}
```

---

## 3. Message Templates

All outbound messages use pre-approved templates. Templates must be submitted to Meta for approval before use.

### 3.1 Template Catalog

| Template Name | Category | Use Case |
|---|---|---|
| `opportunity_alert` | MARKETING | New opportunity broadcast |
| `project_assigned` | UTILITY | Project assignment notification |
| `milestone_reminder` | UTILITY | Overdue milestone alert |
| `payment_approved` | UTILITY | Payment approved notification |
| `payment_sent` | UTILITY | Payment disbursed confirmation |
| `quick_response_confirm` | UTILITY | Confirm YES/NO response received |
| `welcome_freelancer` | MARKETING | First-time freelancer welcome |

### 3.2 Template Definitions

#### `opportunity_alert`

```
Category: MARKETING
Language: en

Body:
Hi {{1}}, new opportunity at {{2}}!

📋 {{3}}
💰 Budget: {{4}} {{5}}
⏰ Respond by: {{6}}

Reply YES to express interest or view details: {{7}}

Parameters:
  {{1}} = freelancer_name
  {{2}} = agency_name
  {{3}} = opportunity_title
  {{4}} = budget_amount
  {{5}} = currency
  {{6}} = response_deadline (formatted)
  {{7}} = deep_link_url

Buttons:
  [URL] "View Details" → {{7}}
  [QUICK_REPLY] "Interested" → YES
  [QUICK_REPLY] "Decline" → NO
```

#### `project_assigned`

```
Category: UTILITY
Language: en

Body:
🎉 You've been assigned to a new project at {{1}}!

Project: {{2}}
Client: {{3}}
First milestone: {{4}} (due {{5}})

View your project: {{6}}

Parameters:
  {{1}} = agency_name
  {{2}} = project_title
  {{3}} = client_name
  {{4}} = milestone_title
  {{5}} = due_date
  {{6}} = project_deep_link
```

#### `milestone_reminder`

```
Category: UTILITY
Language: en

Body:
⏰ Reminder: Milestone "{{1}}" for project "{{2}}" was due on {{3}}.

Please submit your deliverable or contact your manager.

View project: {{4}}

Parameters:
  {{1}} = milestone_title
  {{2}} = project_title
  {{3}} = due_date
  {{4}} = project_deep_link
```

#### `payment_sent`

```
Category: UTILITY
Language: en

Body:
💰 Payment of {{1}} {{2}} has been sent for project "{{3}}".

Reference: {{4}}

Thank you for your work!

Parameters:
  {{1}} = amount
  {{2}} = currency
  {{3}} = project_title
  {{4}} = payment_reference
```

#### `quick_response_confirm`

```
Category: UTILITY
Language: en

Body:
Thanks {{1}}! Your response "{{2}}" for "{{3}}" has been recorded.

The team at {{4}} will be in touch soon.

Parameters:
  {{1}} = freelancer_name
  {{2}} = response (Interested / Declined)
  {{3}} = opportunity_title
  {{4}} = agency_name
```

---

## 4. Outbound Message Flow

### 4.1 Send Template Message

```typescript
// lib/integrations/whatsapp.ts
interface SendTemplateParams {
  tenantId: string
  to: string                    // E.164 phone number
  templateName: string
  languageCode?: string         // default: 'en'
  components: TemplateComponent[]
  entityType?: string
  entityId?: string
  freelancerId?: string
}

export async function sendWhatsAppTemplate(params: SendTemplateParams) {
  const config = await getWhatsAppConfig(params.tenantId)
  if (!config) throw new Error('WhatsApp not configured for tenant')

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to.replace(/\D/g, ''),  // Strip non-digits
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: params.languageCode ?? 'en' },
          components: params.components,
        },
      }),
    }
  )

  const result = await response.json()

  // Log message
  await supabaseAdmin.from('whatsapp_messages').insert({
    tenant_id: params.tenantId,
    freelancer_id: params.freelancerId,
    direction: 'outbound',
    wa_message_id: result.messages?.[0]?.id,
    phone: params.to,
    template_name: params.templateName,
    status: response.ok ? 'sent' : 'failed',
    entity_type: params.entityType,
    entity_id: params.entityId,
    metadata: { response: result },
  })

  return result
}
```

### 4.2 Template Component Builder

```typescript
export function buildOpportunityTemplate(
  freelancer: Freelancer,
  opportunity: Opportunity,
  agency: Tenant,
  deepLink: string
): TemplateComponent[] {
  return [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: freelancer.full_name },
        { type: 'text', text: agency.name },
        { type: 'text', text: opportunity.title },
        { type: 'text', text: String(opportunity.budget) },
        { type: 'text', text: opportunity.currency },
        { type: 'text', text: formatDate(opportunity.response_deadline) },
        { type: 'text', text: deepLink },
      ],
    },
    {
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [{ type: 'text', text: deepLink }],
    },
  ]
}
```

### 4.3 Deep Link Format

```
https://{slug}.talent-os.com/opportunities/{opportunity_id}?ref=wa

For freelancers without accounts:
https://{slug}.talent-os.com/login?email={email}&redirect=/opportunities/{id}&ref=wa
```

---

## 5. Inbound Message Handling

### 5.1 Webhook Verification (GET)

Meta sends a verification challenge on webhook setup:

```typescript
// app/api/webhooks/whatsapp/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}
```

### 5.2 Inbound Message Processing (POST)

```typescript
// app/api/webhooks/whatsapp/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Verify signature
  const signature = request.headers.get('x-hub-signature-256')
  if (!verifyWebhookSignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 })
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue

      const value = change.value

      // Handle status updates (delivered, read)
      for (const status of value.statuses ?? []) {
        await handleStatusUpdate(status)
      }

      // Handle inbound messages
      for (const message of value.messages ?? []) {
        await handleInboundMessage(message, value.metadata)
      }
    }
  }

  return new Response('OK', { status: 200 })
}
```

### 5.3 Message Parser

```typescript
async function handleInboundMessage(
  message: WhatsAppMessage,
  metadata: { phone_number_id: string }
) {
  const phone = `+${message.from}`
  const body = message.text?.body?.trim().toUpperCase() ?? ''
  const waMessageId = message.id

  // Resolve tenant from phone_number_id
  const tenantId = await resolveTenantByPhoneNumberId(metadata.phone_number_id)
  if (!tenantId) return

  // Resolve freelancer from phone
  const freelancer = await findFreelancerByPhone(tenantId, phone)
  if (!freelancer) {
    await logUnknownSender(tenantId, phone, body)
    return
  }

  // Log inbound message
  await supabaseAdmin.from('whatsapp_messages').insert({
    tenant_id: tenantId,
    freelancer_id: freelancer.id,
    direction: 'inbound',
    wa_message_id: waMessageId,
    phone,
    body: message.text?.body,
    status: 'received',
  })

  // Parse quick responses
  const responseMap: Record<string, 'interested' | 'declined'> = {
    'YES': 'interested',
    'INTERESTED': 'interested',
    'Y': 'interested',
    'NO': 'declined',
    'DECLINE': 'declined',
    'DECLINED': 'declined',
    'N': 'declined',
  }

  const response = responseMap[body]
  if (response) {
    // Find pending opportunity for this freelancer
    const recipient = await findPendingOpportunityRecipient(tenantId, freelancer.id)
    if (recipient) {
      await supabaseAdmin
        .from('opportunity_recipients')
        .update({
          response,
          responded_at: new Date().toISOString(),
          response_note: `Via WhatsApp: ${body}`,
        })
        .eq('id', recipient.id)

      // Send confirmation
      await dispatchN8nEvent(tenantId, 'whatsapp.response_processed', {
        freelancer_id: freelancer.id,
        response,
        opportunity_id: recipient.opportunity_id,
        phone,
      })
    }
  } else {
    // Unrecognized message — notify manager
    await dispatchN8nEvent(tenantId, 'whatsapp.unrecognized', {
      freelancer_id: freelancer.id,
      phone,
      body: message.text?.body,
    })
  }
}
```

### 5.4 Delivery Status Updates

```typescript
async function handleStatusUpdate(status: WhatsAppStatus) {
  const { id: waMessageId, status: deliveryStatus } = status

  await supabaseAdmin
    .from('whatsapp_messages')
    .update({ status: deliveryStatus })
    .eq('wa_message_id', waMessageId)

  // Update opportunity_recipients delivery flag
  if (deliveryStatus === 'delivered') {
    await supabaseAdmin
      .from('opportunity_recipients')
      .update({ whatsapp_delivered: true })
      .eq('id', (
        await supabaseAdmin
          .from('whatsapp_messages')
          .select('entity_id')
          .eq('wa_message_id', waMessageId)
          .single()
      ).data?.entity_id)
  }
}
```

---

## 6. Message Flow Diagrams

### 6.1 Opportunity Broadcast

```
Manager clicks "Broadcast"
        │
        ▼
Server Action: broadcastOpportunity()
        │
        ├── Create opportunity_recipients rows
        ├── Create in-app notifications
        └── dispatchN8nEvent('opportunity.broadcast')
                │
                ▼
        n8n WF-02: For each recipient
                │
                ├── Fetch WhatsApp config (tenant)
                ├── Build template components
                ├── POST to WhatsApp Cloud API
                ├── Log to whatsapp_messages
                └── Update whatsapp_sent_at
                        │
                        ▼
                Freelancer receives WhatsApp
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
        Tap link    Reply YES    Reply NO
            │           │           │
            ▼           ▼           ▼
        Web app    Webhook      Webhook
        login      handler      handler
            │           │           │
            └───────────┼───────────┘
                        ▼
            opportunity_recipients updated
                        │
                        ▼
            Manager notified (WF-03)
```

### 6.2 Payment Notification

```
Admin marks payment as paid
        │
        ▼
Server Action: markPaymentPaid()
        │
        ├── Update payments.status = 'paid'
        └── dispatchN8nEvent('payment.paid')
                │
                ▼
        n8n WF-07
                │
                ├── In-app notification to freelancer
                └── WhatsApp template: payment_sent
```

---

## 7. Rate Limits & Quotas

### 7.1 Meta API Limits

| Tier | Messages / 24h | Business Initiated |
|---|---|---|
| Tier 1 (new) | 1,000 | 250 |
| Tier 2 | 10,000 | 1,000 |
| Tier 3 | 100,000 | 10,000 |
| Unlimited | Unlimited | Unlimited |

**Note:** Tier upgrades based on quality rating and message volume.

### 7.2 Application-Level Limits

| Limit | Value | Enforcement |
|---|---|---|
| Broadcast batch size | 50 recipients | Server Action validation |
| Messages per tenant / hour | 200 | n8n rate limiter node |
| Retry attempts | 3 | n8n error handler |
| Template messages only | No free-form | API validation |

### 7.3 Cost Tracking

```sql
-- Track message volume per tenant per month
SELECT
  tenant_id,
  date_trunc('month', created_at) AS month,
  count(*) FILTER (WHERE direction = 'outbound') AS outbound_count,
  count(*) FILTER (WHERE direction = 'inbound') AS inbound_count,
  count(*) FILTER (WHERE status = 'failed') AS failed_count
FROM whatsapp_messages
GROUP BY tenant_id, date_trunc('month', created_at);
```

Display in Admin analytics dashboard. Alert when approaching tier limits.

---

## 8. Error Handling

| Error | Cause | Handling |
|---|---|---|
| `131026` | Message undeliverable | Mark failed; notify manager; skip phone |
| `131047` | Re-engagement required | Send template (not session message) |
| `130429` | Rate limit hit | Queue and retry after 1 hour |
| `100` | Invalid parameter | Log error; alert admin to check config |
| `190` | Access token expired | Alert admin to refresh token |
| Network timeout | API unreachable | Retry 3x; dead letter queue |

```typescript
const RETRYABLE_ERRORS = ['130429', '131000', '2']  // rate limit, unknown, network

async function sendWithRetry(params: SendTemplateParams, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendWhatsAppTemplate(params)
    } catch (error) {
      if (!RETRYABLE_ERRORS.includes(error.code) || attempt === maxRetries) {
        throw error
      }
      await sleep(Math.pow(2, attempt) * 1000)  // exponential backoff
    }
  }
}
```

---

## 9. Security

| Measure | Implementation |
|---|---|
| Webhook signature verification | HMAC-SHA256 with app secret |
| Access token storage | AES-256-GCM encrypted in DB |
| Token rotation | Admin UI to update; alert 7 days before expiry |
| Phone number validation | E.164 format; libphonenumber validation |
| Opt-out handling | Honor STOP/UNSUBSCRIBE; mark freelancer unavailable |
| Message content | Templates only (no free-form outbound) |
| PII in logs | Phone numbers masked in application logs |

### Webhook Signature Verification

```typescript
import { createHmac } from 'crypto'

function verifyWebhookSignature(body: unknown, signature: string | null): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', process.env.WHATSAPP_APP_SECRET!)
    .update(JSON.stringify(body))
    .digest('hex')
  return signature === `sha256=${expected}`
}
```

---

## 10. Testing

### 10.1 Meta Test Environment

- Use Meta's test phone numbers in development
- Test WABA provided by Meta for app review
- Templates can be tested before approval in development mode

### 10.2 Test Checklist

- [ ] Webhook verification (GET challenge) succeeds
- [ ] Template message sends to test number
- [ ] Delivery status webhook updates `whatsapp_messages.status`
- [ ] Inbound YES/NO updates `opportunity_recipients.response`
- [ ] Confirmation template sent after quick reply
- [ ] Invalid phone number handled gracefully
- [ ] Rate limit retry works
- [ ] Token expiry alerts admin
- [ ] Message logging complete (inbound + outbound)
- [ ] Cross-tenant isolation (tenant A config not used for tenant B)

### 10.3 Test Phone Numbers

Configure in `.env.local` for development:

```bash
WHATSAPP_TEST_PHONE=+15551234567
WHATSAPP_TEST_PHONE_NUMBER_ID=123456789
WHATSAPP_TEST_ACCESS_TOKEN=EAAx...
```

---

## 11. Compliance

| Requirement | Action |
|---|---|
| User opt-in | Freelancer provides phone during onboarding; consent checkbox |
| Opt-out | STOP/UNSUBSCRIBE keywords → set `availability: unavailable` |
| Data retention | WhatsApp messages purged after 2 years (WF-12) |
| Template approval | All templates submitted to Meta before production use |
| Business verification | Required for production API access |
| Conversation window | 24-hour window for session messages; templates for business-initiated |
