# Talent OS — Architecture Diagrams

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Audit Date** | 2026-07-30 |
| **Format** | Mermaid |

This document consolidates all architecture diagrams for Talent OS.

---

## 1. System Context (C4 Level 1)

```mermaid
flowchart TB
    subgraph Actors
        ADMIN[("Admin<br/>(Agency Owner)")]
        TM[("Talent Manager")]
        TALENT[("Freelancer")]
        CLIENT[("Client User")]
    end

    subgraph System["Talent OS"]
        APP["Talent OS Platform<br/>(Next.js + Supabase)"]
    end

    subgraph External
        N8N["n8n<br/>(Automation)"]
        WA["WhatsApp<br/>(Meta Cloud API)"]
        AI["OpenAI<br/>(AI Services)"]
        EMAIL["Email Provider"]
    end

    ADMIN --> APP
    TM --> APP
    TALENT --> APP
    TALENT -.->|optional| WA
    CLIENT --> APP

    APP <--> N8N
    APP <--> WA
    APP --> AI
    N8N --> WA
    N8N --> EMAIL
    N8N --> APP
    WA --> APP
```

---

## 2. Container Diagram (C4 Level 2)

```mermaid
flowchart TB
    subgraph Browser
        WEB["Web Dashboard<br/>(React 19)"]
    end

    subgraph Vercel["Vercel Platform"]
        MW["Middleware<br/>(Auth + RBAC)"]
        PAGES["App Router<br/>(Server Components)"]
        ACTIONS["Server Actions<br/>(10 modules)"]
        API["Route Handlers<br/>(17 endpoints)"]
        CRON["Cron Jobs<br/>(2 endpoints)"]
    end

    subgraph Supabase["Supabase Cloud"]
        AUTH["Auth Service"]
        DB[("PostgreSQL 15<br/>RLS + RPC")]
        STORE["Storage<br/>(portfolio, deliverables)"]
    end

    subgraph External["External Services"]
        N8N["n8n Workflows"]
        META["Meta WhatsApp API"]
        OAI["OpenAI API"]
    end

    WEB --> MW
    MW --> PAGES
    MW --> API
    PAGES --> ACTIONS
    ACTIONS --> DB
    ACTIONS --> AUTH
    API --> DB
    CRON --> DB
    CRON --> OAI
    API --> N8N
    API --> META
    N8N --> META
    ACTIONS --> STORE
    META --> API
    N8N --> API
```

---

## 3. Component Diagram (Application Layer)

```mermaid
flowchart TB
    subgraph Presentation Layer
        UI["UI Components<br/>(35 files)"]
        PAGES["Pages<br/>(22 routes)"]
    end

    subgraph Application Layer
        AUTH_A["Auth Actions"]
        TALENT_A["Talent Actions"]
        OPP_A["Opportunity Actions"]
        PROJ_A["Project Actions"]
        AI_A["AI Actions"]
        API_RH["Route Handlers"]
        MW_C["Middleware"]
    end

    subgraph Domain Layer
        PERM["Permissions<br/>(RBAC Map)"]
        VALID["Validation<br/>(Zod Schemas)"]
        TYPES["Domain Types"]
    end

    subgraph Infrastructure Layer
        SUPA_S["Supabase Server"]
        SUPA_A["Supabase Admin"]
        EVENTS["Event Outbox"]
        AI_INT["AI Integration"]
        WA_INT["WhatsApp Integration"]
        N8N_INT["n8n Integration"]
        ENCRYPT["Encryption/HMAC"]
    end

    PAGES --> UI
    PAGES --> AUTH_A
    PAGES --> TALENT_A
    PAGES --> OPP_A
    PAGES --> PROJ_A
    UI --> OPP_A
    UI --> PROJ_A
    UI --> AI_A

    MW_C --> SUPA_S
    AUTH_A --> PERM
    TALENT_A --> VALID
    OPP_A --> EVENTS
    PROJ_A --> EVENTS
    AI_A --> AI_INT

    AUTH_A --> SUPA_S
    TALENT_A --> SUPA_S
    OPP_A --> SUPA_S
    PROJ_A --> SUPA_S

    EVENTS --> SUPA_A
    AI_INT --> SUPA_A
    WA_INT --> SUPA_A
    N8N_INT --> ENCRYPT
    API_RH --> WA_INT
    API_RH --> N8N_INT
```

---

## 4. Entity Relationship Diagram

```mermaid
erDiagram
    tenants {
        uuid id PK
        text name
        text slug UK
        jsonb settings
        text subscription_status
    }

    profiles {
        uuid id PK
        text email
        text full_name
    }

    tenant_members {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        user_role role
        uuid company_id FK
    }

    companies {
        uuid id PK
        uuid tenant_id FK
        text name
        text slug
    }

    freelancers {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        text email
        text full_name
        text[] skills
        numeric day_rate
    }

    opportunities {
        uuid id PK
        uuid tenant_id FK
        text title
        text status
        jsonb requirements
        uuid company_id FK
    }

    opportunity_recipients {
        uuid id PK
        uuid opportunity_id FK
        uuid freelancer_id FK
        text response
    }

    shortlists {
        uuid id PK
        uuid opportunity_id FK UK
        text status
    }

    shortlist_items {
        uuid id PK
        uuid shortlist_id FK
        uuid freelancer_id FK
        int rank
    }

    projects {
        uuid id PK
        uuid tenant_id FK
        uuid freelancer_id FK
        uuid company_id FK
        jsonb ai_summary
    }

    milestones {
        uuid id PK
        uuid project_id FK
        text status
        numeric amount
        jsonb submission_files
    }

    payments {
        uuid id PK
        uuid milestone_id FK UK
        uuid freelancer_id FK
        text status
        numeric amount
    }

    domain_events {
        uuid id PK
        uuid tenant_id FK
        text event_type
        text status
        jsonb payload
    }

    ai_requests {
        uuid id PK
        uuid tenant_id FK
        text request_type
        text status
    }

    talent_match_scores {
        uuid id PK
        uuid opportunity_id FK
        uuid freelancer_id FK
        numeric score
    }

    tenants ||--o{ tenant_members : has
    tenants ||--o{ companies : owns
    tenants ||--o{ freelancers : manages
    tenants ||--o{ opportunities : creates
    tenants ||--o{ projects : owns
    profiles ||--o{ tenant_members : member
    profiles ||--o| freelancers : linked
    companies ||--o{ opportunities : client
    companies ||--o{ projects : client
    opportunities ||--o{ opportunity_recipients : broadcast
    opportunities ||--o| shortlists : has
    shortlists ||--o{ shortlist_items : contains
    freelancers ||--o{ opportunity_recipients : responds
    freelancers ||--o{ talent_match_scores : scored
    projects ||--o{ milestones : contains
    projects ||--|| freelancers : assigned
    milestones ||--o| payments : triggers
    opportunities ||--o{ talent_match_scores : ranked
    tenants ||--o{ domain_events : emits
    tenants ||--o{ ai_requests : tracks
```

---

## 5. Module Relationship Diagram

```mermaid
flowchart TB
    subgraph Identity
        AUTH[Authentication]
        TENANT[Tenancy]
        RBAC[RBAC Permissions]
    end

    subgraph Talent Domain
        ROSTER[Talent Roster]
        PORT[Portfolio]
        RATING[Ratings]
        SEARCH[Talent Search]
    end

    subgraph Opportunity Domain
        OPP[Opportunities]
        BROADCAST[Broadcasting]
        RESPONSE[Responses]
        SHORTLIST[Shortlisting]
        MATCH[AI Matching]
    end

    subgraph Project Domain
        PROJ[Projects]
        MILE[Milestones]
        REVIEW[Review/Approval]
    end

    subgraph Financial
        PAY[Payments]
    end

    subgraph Communication
        NOTIF[Notifications]
        WA[WhatsApp]
        EMAIL[Email]
    end

    subgraph Platform
        EVENTS[Event Outbox]
        AI_GOV[AI Governance]
        ANALYTICS[Analytics]
    end

    AUTH --> TENANT
    TENANT --> RBAC

    RBAC --> ROSTER
    RBAC --> OPP
    RBAC --> PROJ

    ROSTER --> BROADCAST
    OPP --> BROADCAST
    BROADCAST --> RESPONSE
    RESPONSE --> SHORTLIST
    OPP --> MATCH
    MATCH --> SHORTLIST
    SHORTLIST --> PROJ

    PROJ --> MILE
    MILE --> REVIEW
    REVIEW --> PAY

    BROADCAST --> WA
    BROADCAST --> NOTIF
    PROJ --> NOTIF
    PAY --> NOTIF

    OPP --> EVENTS
    PROJ --> EVENTS
    MATCH --> AI_GOV
    EVENTS --> WA
    EVENTS --> EMAIL

    ROSTER --> ANALYTICS
    OPP --> ANALYTICS
    PAY --> ANALYTICS
```

---

## 6. Authentication Sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant B as Browser
    participant MW as Middleware
    participant SA as Supabase Auth
    participant PG as PostgreSQL

    U->>B: Enter credentials
    B->>SA: signInWithPassword()
    SA-->>B: JWT session cookie

    U->>B: Navigate to /dashboard
    B->>MW: GET /dashboard (with cookie)
    MW->>SA: Refresh + validate JWT
    MW->>PG: SELECT tenant_members (role)
    MW->>MW: Check route permissions
    MW->>B: Forward to page
    B->>PG: Server Component queries (RLS)
    PG-->>B: Render dashboard
```

---

## 7. Agency Signup Sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant SA as signUpAgency()
    participant AUTH as Supabase Auth
    participant RPC as create_tenant_with_admin
    participant PG as PostgreSQL
    participant CK as Cookie

    U->>SA: Agency name + email + password
    SA->>AUTH: auth.signUp()
    AUTH-->>SA: user.id
    SA->>RPC: p_name, p_slug, p_user_id
    RPC->>PG: INSERT tenants
    RPC->>PG: INSERT profiles
    RPC->>PG: INSERT tenant_members (admin)
    RPC-->>SA: tenant_id
    SA->>CK: Set ACTIVE_TENANT_COOKIE
    SA-->>U: Redirect to /dashboard
```

---

## 8. Opportunity Broadcast Sequence

```mermaid
sequenceDiagram
    autonumber
    participant M as Manager
    participant BA as broadcastOpportunity()
    participant PG as PostgreSQL
    participant EV as emitEvent()
    participant CR as Cron dispatch-events
    participant N8 as n8n
    participant WA as WhatsApp

    M->>BA: Select talent + broadcast
    BA->>PG: UPSERT opportunity_recipients
    BA->>PG: UPDATE opportunity → open
    BA->>PG: INSERT notifications
    BA->>EV: opportunity.broadcast event
    BA-->>M: Success + count

    Note over CR: Vercel Cron (scheduled)
    CR->>PG: SELECT pending domain_events
    CR->>N8: POST /opportunity.broadcast
    N8->>WA: Send template to each talent
    WA-->>N8: Delivery status
    N8->>CR: Callback /api/webhooks/n8n
    CR->>PG: UPDATE whatsapp_sent_at
```

---

## 9. AI Matching Sequence

```mermaid
sequenceDiagram
    autonumber
    participant M as Manager
    participant API as /api/ai/match
    participant GOV as AI Governance
    participant PG as PostgreSQL
    participant CR as Cron
    participant OAI as OpenAI
    participant FB as Rule Fallback

    M->>API: Request match for opportunity
    API->>GOV: Check limits + feature flag
    API->>PG: INSERT ai_requests (pending)
    API->>PG: emit ai.match_requested
    API-->>M: { aiRequestId, pending }

    CR->>PG: Fetch event
    CR->>PG: Load opportunity + candidates
    CR->>OAI: rankTalentWithOpenAi()
    alt OpenAI unavailable
        CR->>FB: runRuleBasedMatching()
        FB-->>CR: Rule-based scores
    end
    OAI-->>CR: Ranked matches + rationale
    CR->>PG: UPSERT talent_match_scores
    CR->>PG: UPDATE ai_requests → completed
    CR->>PG: INSERT notification
```

---

## 10. Project Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> draft: createProject (optional)
    draft --> active: Activate
    active --> in_review: Milestone submitted
    in_review --> active: Revision requested
    in_review --> completed: All milestones approved
    active --> on_hold: Manager pause
    on_hold --> active: Manager resume
    active --> canceled: Cancel
    completed --> archived: Archive
    canceled --> [*]
    archived --> [*]

    state milestone {
        [*] --> pending
        pending --> in_progress: Talent starts
        in_progress --> submitted: Talent submits
        submitted --> approved: Manager approves
        submitted --> revision: Manager requests revision
        revision --> in_progress: Talent revises
        approved --> [*]
    }

    state payment {
        [*] --> pending: Auto-created on approval
        pending --> approved: Manager approves payment
        approved --> processing: Finance processes
        processing --> paid: Confirmed
        paid --> [*]
    }
```

---

## 11. Event Outbox Flow

```mermaid
flowchart TD
    A[Domain Action] -->|emitEvent| B[(domain_events<br/>status: pending)]
    C[Vercel Cron] -->|GET /api/cron/dispatch-events| B
    B --> D{Event Type?}

    D -->|AI event + direct mode| E[executeAiRequest]
    D -->|All other events| F[dispatchToN8n]

    E --> G{Success?}
    F --> H{Success?}

    G -->|Yes| I[status: delivered]
    G -->|No| J[status: failed → retry]
    H -->|Yes| I
    H -->|No| J

    J -->|retry_count >= max| K[status: dead_letter]
    J -->|retry_count < max| L[Exponential backoff<br/>re-schedule]
    L --> B
```

---

## 12. Multi-Tenant Data Isolation

```mermaid
flowchart TB
    subgraph Request
        JWT["JWT → auth.uid()"]
        COOKIE["ACTIVE_TENANT_COOKIE"]
    end

    subgraph Application Guards
        MW["Middleware<br/>(route RBAC)"]
        PERM["Permission Map<br/>(action RBAC)"]
    end

    subgraph Database Guards
        RLS["Row-Level Security"]
        HELP["Helper Functions<br/>(user_tenant_ids, etc.)"]
        RPC["SECURITY DEFINER RPCs<br/>(authorization checks)"]
    end

    JWT --> MW
    COOKIE --> MW
    MW --> PERM
    PERM --> RLS
    JWT --> HELP
    HELP --> RLS
    PERM --> RPC
    RPC --> RLS

    RLS --> DATA[("Tenant-Scoped Data")]
```

---

## 13. Deployment Architecture

```mermaid
flowchart TB
    subgraph Users
        BROWSER[Browser]
        META_WH[Meta Webhook]
    end

    subgraph Vercel Edge
        CDN[CDN / Edge Network]
        EDGE_MW[Edge Middleware]
    end

    subgraph Vercel Serverless
        FUNCTIONS[Node.js Functions<br/>Server Actions + API]
        CRON_JOBS[Cron Functions]
    end

    subgraph Supabase
        POOLER[Connection Pooler<br/>PgBouncer]
        PRIMARY[("PostgreSQL Primary")]
        AUTH_SVC[GoTrue Auth]
        S3[Storage API]
    end

    subgraph External
        N8N_SVC[n8n Instance]
        OPENAI_SVC[OpenAI API]
    end

    BROWSER --> CDN
    CDN --> EDGE_MW
    EDGE_MW --> FUNCTIONS
    META_WH --> FUNCTIONS
    CRON_JOBS --> FUNCTIONS
    FUNCTIONS --> POOLER
    POOLER --> PRIMARY
    FUNCTIONS --> AUTH_SVC
    FUNCTIONS --> S3
    FUNCTIONS --> N8N_SVC
    FUNCTIONS --> OPENAI_SVC
```

---

## 14. Dependency Graph

```mermaid
flowchart BT
    subgraph Runtime
        NEXT[next.js 15]
        REACT[react 19]
        REACTDOM[react-dom 19]
    end

    subgraph Data
        SUPA_JS["@supabase/supabase-js"]
        SUPA_SSR["@supabase/ssr"]
    end

    subgraph Validation
        ZOD[zod]
    end

    subgraph UI
        RADIX["@radix-ui/*"]
        CVA[class-variance-authority]
        CLSX[clsx]
        TWM[tailwind-merge]
        TWANIM[tailwindcss-animate]
        LUCIDE[lucide-react]
        DATES[date-fns]
    end

    subgraph Dev
        TS[typescript]
        ESLINT[eslint + eslint-config-next]
        TW[tailwindcss]
    end

    NEXT --> REACT
    NEXT --> REACTDOM
    NEXT --> SUPA_SSR
    SUPA_SSR --> SUPA_JS
    NEXT --> ZOD
    NEXT --> RADIX
    NEXT --> CVA
    CVA --> CLSX
    NEXT --> TWM
    NEXT --> TWANIM
    NEXT --> LUCIDE
    NEXT --> DATES

    TS -.-> NEXT
    ESLINT -.-> NEXT
    TW -.-> NEXT
```

---

## 15. Role-Based Access Matrix

```mermaid
flowchart LR
    subgraph Roles
        ADMIN[admin]
        TM[talent_manager]
        FL[freelancer]
        CL[client]
    end

    subgraph Admin Only
        A1[Settings/Billing]
        A2[Team Management]
        A3[Integrations]
    end

    subgraph Manager Access
        M1[Talent CRUD]
        M2[Opportunities]
        M3[Projects]
        M4[Analytics]
        M5[AI Features]
    end

    subgraph Freelancer Access
        F1[Own Profile]
        F2[Respond to Opps]
        F3[Submit Milestones]
        F4[View Payments]
    end

    subgraph Client Access
        C1[Company Projects]
        C2[Company Opportunities]
    end

    ADMIN --> A1
    ADMIN --> A2
    ADMIN --> A3
    ADMIN --> M1

    TM --> M1
    TM --> M2
    TM --> M3
    TM --> M4
    TM --> M5

    FL --> F1
    FL --> F2
    FL --> F3
    FL --> F4

    CL --> C1
    CL --> C2
```

---

## 16. WhatsApp Integration Architecture

```mermaid
flowchart TB
    subgraph Outbound
        EV[domain_events] --> CRON[dispatch-events]
        CRON --> N8N[n8n workflow]
        N8N --> META_SEND[Meta Cloud API]
        META_SEND --> TALENT[Talent Phone]
    end

    subgraph Inbound
        TALENT2[Talent Phone] --> META_RECV[Meta Cloud API]
        META_RECV --> WH[webhook/whatsapp]
        WH --> VERIFY[HMAC Verify]
        VERIFY --> IDEM[Idempotency Check]
        IDEM --> PARSE[Parse Message]
        PARSE --> QUICK{Quick Reply?}
        QUICK -->|YES/NO| UPDATE[Update Response]
        QUICK -->|Other| N8N2[Forward to n8n]
        UPDATE --> LOG[Log whatsapp_messages]
    end

    subgraph Callback
        N8N --> CB[webhook/n8n]
        CB --> STATUS[Update Delivery Status]
    end
```

---

## 17. Target AI-Native Architecture

```mermaid
flowchart TB
    subgraph Data Ingestion
        PROFILES[Talent Profiles]
        BRIEFS[Opportunity Briefs]
        OUTCOMES[Project Outcomes]
        WA_MSG[WhatsApp Messages]
    end

    subgraph AI Platform
        EMB[Embedding Service<br/>pgvector]
        NLU[NLU Parser]
        MATCH[Hybrid Matcher]
        AGENT[AI PM Agent]
        FORECAST[Capacity Forecaster]
    end

    subgraph Knowledge Store
        VDB[(Vector Index<br/>per tenant)]
        KG[Talent Knowledge Graph]
        FEEDBACK[Outcome Feedback Loop]
    end

    PROFILES --> EMB
    BRIEFS --> EMB
    OUTCOMES --> KG
    WA_MSG --> NLU

    EMB --> VDB
    VDB --> MATCH
    KG --> MATCH
    MATCH --> FEEDBACK
    FEEDBACK --> EMB

    AGENT --> FORECAST
    AGENT --> NLU
    MATCH --> AGENT
```

---

*See also: [01-Architecture.md](./01-Architecture.md), [09-Improvement-Plan.md](./09-Improvement-Plan.md)*
