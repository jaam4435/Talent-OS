# Appendix B: TalentOS API Design

| Field | Value |
|-------|-------|
| **Version** | v1.0.0 |
| **Spec** | OpenAPI 3.1 |
| **Base URL** | `https://api.talentos.io/v1` |
| **Auth** | Bearer JWT / OAuth 2.0 Client Credentials |
| **Last Updated** | 2026-07-01 |

---

## 1. API Design Principles

1. **RESTful resources** with consistent naming (`/talents`, `/opportunities`)
2. **Tenant scoping** via JWT `workspace_id` claim — never accept workspace_id in URL for isolation
3. **Cursor-based pagination** for all list endpoints
4. **Idempotency-Key** header required for POST/PATCH on financial and messaging endpoints
5. **Optimistic concurrency** via `ETag` / `If-Match` on updates
6. **Rate limiting** via `X-RateLimit-*` headers
7. **Error format** follows RFC 7807 Problem Details
8. **Versioning** via URL path prefix (`/v1`)

---

## 2. Authentication

### 2.1 User Authentication (Web Dashboard)

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "priya@agency.com",
  "password": "***",
  "mfa_code": "123456"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbG...",
  "refresh_token": "dGhpcy...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user": {
    "id": "uuid",
    "email": "priya@agency.com",
    "full_name": "Priya Sharma"
  },
  "workspaces": [
    { "id": "uuid", "name": "Creative Co", "role": "talent_manager" }
  ]
}
```

### 2.2 API Key / OAuth (Integrations)

```http
POST /v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=...
&client_secret=...
&scope=read:talents write:opportunities
```

### 2.3 JWT Claims

```json
{
  "sub": "user-uuid",
  "workspace_id": "workspace-uuid",
  "role": "talent_manager",
  "permissions": ["talents:read", "opportunities:write"],
  "iat": 1719792000,
  "exp": 1719795600
}
```

---

## 3. Common Patterns

### 3.1 Pagination

```http
GET /v1/talents?limit=50&cursor=eyJpZCI6InV1aWQifQ
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6InV1aWQyIn0",
    "has_more": true,
    "total_count": 342
  }
}
```

### 3.2 Filtering

```
GET /v1/talents?status=active&skill=video-editing&performance_score[gte]=70
GET /v1/opportunities?status=open&sort=-created_at
GET /v1/projects?status=active&project_manager=uuid
```

### 3.3 Error Response (RFC 7807)

```json
{
  "type": "https://api.talentos.io/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "Response deadline must be in the future",
  "instance": "/v1/opportunities",
  "errors": [
    { "field": "response_deadline", "message": "must be after now()" }
  ],
  "request_id": "req-uuid"
}
```

### 3.4 Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1719795600
```

---

## 4. API Endpoints

### 4.1 Workspaces

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/current` | Get current workspace | `workspace:read` |
| PATCH | `/workspaces/current` | Update workspace settings | `workspace:write` |
| GET | `/workspaces/current/usage` | Plan usage metrics | `workspace:read` |
| GET | `/workspaces/current/members` | List workspace members | `members:read` |
| POST | `/workspaces/current/members/invite` | Invite member | `members:write` |
| DELETE | `/workspaces/current/members/{id}` | Remove member | `members:write` |

### 4.2 Talents

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/talents` | List talents (filterable) | `talents:read` |
| POST | `/talents` | Create talent | `talents:write` |
| GET | `/talents/{id}` | Get talent detail | `talents:read` |
| PATCH | `/talents/{id}` | Update talent | `talents:write` |
| DELETE | `/talents/{id}` | Archive talent | `talents:delete` |
| POST | `/talents/import` | Bulk CSV import | `talents:write` |
| GET | `/talents/{id}/history` | Profile change history | `talents:read` |
| GET | `/talents/{id}/performance` | Performance records | `talents:read` |
| GET | `/talents/{id}/communications` | Communication timeline | `communications:read` |
| POST | `/talents/search` | AI semantic search | `talents:read` |
| POST | `/talents/{id}/block` | Block talent | `talents:write` |
| POST | `/talents/merge` | Merge duplicates | `talents:write` |

**Create Talent:**
```http
POST /v1/talents
Content-Type: application/json

{
  "full_name": "Diego Martinez",
  "phone": "+5491112345678",
  "email": "diego@email.com",
  "skills": [
    { "name": "video-editing", "proficiency": 5 },
    { "name": "motion-graphics", "proficiency": 3 }
  ],
  "hourly_rate": 45.00,
  "rate_currency": "USD",
  "timezone": "America/Argentina/Buenos_Aires",
  "availability_hours": 30,
  "custom_fields": { "preferred_genre": "documentary" }
}
```

**AI Semantic Search:**
```http
POST /v1/talents/search
Content-Type: application/json

{
  "query": "experienced podcast editor with Adobe Audition, available next week",
  "limit": 20,
  "filters": { "status": "active" }
}
```

**Response:**
```json
{
  "data": [
    {
      "talent": { "id": "uuid", "full_name": "...", "performance_score": 87 },
      "relevance_score": 0.94,
      "match_factors": ["skill:podcast-editing", "skill:adobe-audition", "availability:high"]
    }
  ]
}
```

### 4.3 Segments

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/segments` | List segments | `segments:read` |
| POST | `/segments` | Create segment | `segments:write` |
| GET | `/segments/{id}` | Get segment | `segments:read` |
| PATCH | `/segments/{id}` | Update segment | `segments:write` |
| DELETE | `/segments/{id}` | Delete segment | `segments:delete` |
| GET | `/segments/{id}/talents` | List segment members | `segments:read` |
| POST | `/segments/{id}/talents` | Add talents (static) | `segments:write` |
| DELETE | `/segments/{id}/talents/{talent_id}` | Remove talent | `segments:write` |
| POST | `/segments/{id}/refresh` | Refresh dynamic segment | `segments:write` |

### 4.4 Opportunities

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/opportunities` | List opportunities | `opportunities:read` |
| POST | `/opportunities` | Create opportunity | `opportunities:write` |
| GET | `/opportunities/{id}` | Get opportunity | `opportunities:read` |
| PATCH | `/opportunities/{id}` | Update opportunity | `opportunities:write` |
| POST | `/opportunities/{id}/publish` | Open for responses | `opportunities:write` |
| POST | `/opportunities/{id}/close` | Close opportunity | `opportunities:write` |
| POST | `/opportunities/{id}/broadcast` | Send WhatsApp broadcast | `opportunities:broadcast` |
| GET | `/opportunities/{id}/broadcasts` | List broadcast history | `opportunities:read` |
| GET | `/opportunities/{id}/responses` | List responses | `opportunities:read` |
| POST | `/opportunities/{id}/match` | AI match talent | `opportunities:read` |

**Create & Broadcast:**
```http
POST /v1/opportunities
{
  "title": "YouTube Thumbnail Designer Needed",
  "description": "Need 10 thumbnails/week for tech channel",
  "requirements": {
    "skills": ["graphic-design", "youtube-thumbnails"],
    "experience_years": 2
  },
  "budget_max": 500,
  "budget_currency": "USD",
  "response_deadline": "2026-07-08T23:59:59Z",
  "segment_id": "uuid",
  "sample_required": true,
  "sample_brief": "Create thumbnail for provided video title"
}
```

```http
POST /v1/opportunities/{id}/broadcast
Idempotency-Key: broadcast-uuid-001
{
  "template_name": "opportunity_notification_v2",
  "scheduled_at": null
}
```

**Response 202:**
```json
{
  "broadcast_id": "uuid",
  "status": "processing",
  "estimated_recipients": 142,
  "job_id": "job-uuid"
}
```

### 4.5 Responses & Shortlisting

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/opportunities/{id}/responses` | List responses | `opportunities:read` |
| GET | `/responses/{id}` | Get response detail | `opportunities:read` |
| PATCH | `/responses/{id}` | Update shortlist status | `shortlist:write` |
| POST | `/responses/bulk-shortlist` | Bulk shortlist/reject | `shortlist:write` |

**Update Shortlist:**
```http
PATCH /v1/responses/{id}
{
  "shortlist_status": "shortlisted",
  "internal_notes": "Strong portfolio, competitive rate"
}
```

### 4.6 Sample Assignments

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/sample-assignments` | Create sample assignment | `samples:write` |
| GET | `/sample-assignments/{id}` | Get sample detail | `samples:read` |
| POST | `/sample-assignments/{id}/score` | Score sample | `samples:score` |

### 4.7 Projects

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/projects` | List projects | `projects:read` |
| POST | `/projects` | Create project | `projects:write` |
| GET | `/projects/{id}` | Get project | `projects:read` |
| PATCH | `/projects/{id}` | Update project | `projects:write` |
| POST | `/projects/{id}/assign` | Assign talent | `projects:write` |
| GET | `/projects/{id}/assignments` | List assignments | `projects:read` |
| GET | `/projects/{id}/tasks` | List tasks | `tasks:read` |
| GET | `/projects/{id}/deliverables` | List deliverables | `deliverables:read` |
| GET | `/projects/{id}/health` | Project health summary | `projects:read` |

**Create from Shortlist:**
```http
POST /v1/projects
{
  "name": "Tech Channel Thumbnails - July",
  "opportunity_id": "uuid",
  "budget": 2000,
  "budget_currency": "USD",
  "start_date": "2026-07-15",
  "end_date": "2026-08-15",
  "assignments": [
    {
      "talent_id": "uuid",
      "agreed_rate": 500,
      "rate_type": "fixed",
      "role": "Thumbnail Designer"
    }
  ]
}
```

### 4.8 Tasks

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/tasks` | List tasks (cross-project) | `tasks:read` |
| POST | `/projects/{id}/tasks` | Create task | `tasks:write` |
| GET | `/tasks/{id}` | Get task | `tasks:read` |
| PATCH | `/tasks/{id}` | Update task | `tasks:write` |
| POST | `/tasks/{id}/complete` | Mark complete | `tasks:write` |
| POST | `/tasks/{id}/dependencies` | Add dependency | `tasks:write` |

### 4.9 Deliverables

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/deliverables` | List deliverables | `deliverables:read` |
| POST | `/tasks/{id}/deliverables` | Create deliverable | `deliverables:write` |
| GET | `/deliverables/{id}` | Get deliverable | `deliverables:read` |
| POST | `/deliverables/{id}/submit` | Submit new version | `deliverables:submit` |
| POST | `/deliverables/{id}/approve` | Approve deliverable | `deliverables:approve` |
| POST | `/deliverables/{id}/reject` | Reject deliverable | `deliverables:approve` |
| POST | `/deliverables/{id}/revisions` | Request revision | `deliverables:approve` |
| GET | `/deliverables/{id}/versions` | List versions | `deliverables:read` |
| GET | `/deliverables/{id}/upload-url` | Presigned upload URL | `deliverables:submit` |

**Request Revision:**
```http
POST /v1/deliverables/{id}/revisions
{
  "feedback": "Text too small on mobile. Increase contrast on CTA button.",
  "rubric_feedback": {
    "readability": 2,
    "brand_alignment": 4,
    "visual_impact": 3
  },
  "due_date": "2026-07-05T18:00:00Z"
}
```

### 4.10 Approvals

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/approvals/pending` | My pending approvals | `approvals:read` |
| POST | `/approvals/{id}/decide` | Approve/reject | `approvals:decide` |
| GET | `/approval-chains` | List approval chains | `approvals:read` |
| POST | `/approval-chains` | Create chain | `approvals:write` |

### 4.11 Payments

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/payments` | List payments | `payments:read` |
| GET | `/payments/{id}` | Get payment | `payments:read` |
| POST | `/payments/{id}/approve` | Approve payment | `payments:approve` |
| POST | `/payments/batch-approve` | Batch approve | `payments:approve` |
| POST | `/payments/{id}/process` | Initiate payout | `payments:process` |
| POST | `/payments/{id}/record` | Record manual payment | `payments:process` |
| GET | `/payments/export` | Export for accounting | `payments:export` |

### 4.12 Communications

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/communications` | List communications | `communications:read` |
| POST | `/communications` | Log manual communication | `communications:write` |

### 4.13 Analytics & Reports

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/analytics/dashboard` | Executive dashboard | `analytics:read` |
| GET | `/analytics/talent-pipeline` | Pipeline funnel | `analytics:read` |
| GET | `/analytics/capacity` | Capacity heatmap | `analytics:read` |
| GET | `/analytics/performance` | Talent performance | `analytics:read` |
| GET | `/analytics/cost` | Cost per deliverable | `analytics:read` |
| POST | `/reports/generate` | Generate custom report | `reports:read` |

### 4.14 Automations

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/automations` | List automations | `automations:read` |
| POST | `/automations` | Create automation | `automations:write` |
| PATCH | `/automations/{id}` | Update automation | `automations:write` |
| DELETE | `/automations/{id}` | Delete automation | `automations:delete` |
| GET | `/automations/{id}/executions` | Execution history | `automations:read` |

### 4.15 Skills

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/skills` | List skills | `skills:read` |
| POST | `/skills` | Create skill | `skills:write` |

### 4.16 Audit Logs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/audit-logs` | Query audit logs | `audit:read` |

---

## 5. Webhook Endpoints (Inbound)

### 5.1 WhatsApp Webhook

```http
GET /v1/webhooks/whatsapp
  ?hub.mode=subscribe
  &hub.verify_token={token}
  &hub.challenge={challenge}

POST /v1/webhooks/whatsapp
X-Hub-Signature-256: sha256=...
```

**Inbound message processing:**
1. Verify Meta signature
2. Parse message type (text, interactive, media)
3. Match to talent by phone number
4. Route to opportunity response parser or deliverable handler
5. Store in `communications`
6. Trigger automations

### 5.2 Payment Provider Webhooks

```http
POST /v1/webhooks/stripe
Stripe-Signature: ...

POST /v1/webhooks/wise
X-Signature: ...
```

---

## 6. Webhook Events (Outbound)

### 6.1 Registration

```http
POST /v1/webhooks/endpoints
{
  "url": "https://customer.com/hooks/talentos",
  "events": ["deliverable.approved", "payment.completed"],
  "secret": "whsec_..."
}
```

### 6.2 Event Payload (CloudEvents 1.0)

```json
{
  "specversion": "1.0",
  "type": "com.talentos.deliverable.approved",
  "source": "talentos.io",
  "id": "event-uuid",
  "time": "2026-07-01T14:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "workspace_id": "uuid",
    "deliverable": {
      "id": "uuid",
      "project_id": "uuid",
      "talent_id": "uuid",
      "status": "approved"
    }
  }
}
```

**Signature header:**
```http
X-TalentOS-Signature: sha256=HMAC_SHA256(payload, secret)
X-TalentOS-Timestamp: 1719792600
```

### 6.3 Delivery Guarantees

- At-least-once delivery
- Exponential backoff: 1m, 5m, 30m, 2h, 8h (5 retries)
- Endpoint auto-disabled after 10 consecutive failures
- Event log retained 30 days

---

## 7. Real-Time API (WebSocket)

```
wss://api.talentos.io/v1/ws?token={jwt}
```

### 7.1 Event Types (Server → Client)

```json
{ "type": "opportunity.response.received", "data": { ... } }
{ "type": "deliverable.submitted", "data": { ... } }
{ "type": "approval.pending", "data": { ... } }
{ "type": "broadcast.progress", "data": { "sent": 45, "total": 142 } }
```

### 7.2 Subscription

```json
{ "action": "subscribe", "channels": ["opportunities", "approvals", "projects"] }
```

---

## 8. Talent-Facing API (WhatsApp + Microsite)

Talent actions via WhatsApp are handled through webhooks. Talent microsite (token-authenticated):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/talent-portal/profile` | View/edit profile |
| GET | `/talent-portal/opportunities` | View assigned opportunities |
| POST | `/talent-portal/opportunities/{id}/respond` | Web-based response |
| GET | `/talent-portal/projects` | View assigned projects |
| POST | `/talent-portal/deliverables/{id}/submit` | Submit deliverable |
| GET | `/talent-portal/payments` | Payment history |

**Auth:** Magic link token sent via WhatsApp; 24-hour expiry.

---

## 9. API Error Codes

| HTTP | Type | Description |
|------|------|-------------|
| 400 | `bad_request` | Malformed request |
| 401 | `unauthorized` | Missing/invalid token |
| 403 | `forbidden` | Insufficient permissions |
| 404 | `not_found` | Resource not found |
| 409 | `conflict` | Duplicate or state conflict |
| 422 | `validation_error` | Business rule violation |
| 429 | `rate_limited` | Rate limit exceeded |
| 500 | `internal_error` | Server error |

**Business-specific 422 examples:**
- `whatsapp_consent_required` — Talent has not opted in
- `revision_limit_exceeded` — Max revisions reached
- `budget_exceeded` — Project budget cap hit
- `approval_pending` — Cannot process payment without approval
- `broadcast_limit_exceeded` — Plan message quota exhausted

---

## 10. SDK & Developer Experience

| SDK | Language | Priority |
|-----|----------|----------|
| `@talentos/node` | TypeScript/Node | P1 |
| `talentos-python` | Python | P2 |
| OpenAPI generator | Any | P1 |

**Sandbox:** `https://sandbox.api.talentos.io/v1` with test WhatsApp numbers and mock payment provider.

---

## 11. API Versioning & Deprecation

- Breaking changes → new major version (`/v2`)
- Deprecation header: `Sunset: Sat, 01 Jan 2028 00:00:00 GMT`
- Minimum 12-month deprecation window
- Changelog at `https://docs.talentos.io/changelog`
