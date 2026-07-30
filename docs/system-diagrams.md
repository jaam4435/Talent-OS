# System Diagrams

Architecture diagrams for Talent OS. Rendered as Mermaid in GitHub and compatible viewers.

---

## System Context (C4 Level 1)

```mermaid
flowchart TB
  subgraph users [Users]
    Admin[Admin]
    Manager[Talent Manager]
    Freelancer[Freelancer]
    Client[Client]
  end

  subgraph talentos [Talent OS]
    App[Next.js App]
  end

  subgraph infra [Infrastructure]
    Supabase[(Supabase PostgreSQL)]
    Vercel[Vercel Edge]
    Storage[Supabase Storage]
  end

  subgraph integrations [Integrations]
    N8N[n8n Workflows]
    WhatsApp[WhatsApp Cloud API]
    OpenAI[OpenAI]
    Claude[Anthropic Claude]
  end

  Admin & Manager & Freelancer & Client --> App
  App --> Vercel
  App --> Supabase
  App --> Storage
  App --> N8N
  App --> WhatsApp
  App --> OpenAI
  App --> Claude
  N8N --> WhatsApp
```

---

## Application Layers

```mermaid
flowchart TB
  subgraph presentation [Presentation]
    Pages[App Router Pages]
    Components[React Components]
  end

  subgraph application [Application]
    Actions[Server Actions]
    API[Route Handlers]
    Queries[Query Layer]
  end

  subgraph domain [Domain]
    Services[Services]
    Workflows[Workflow Engine]
    AI[AI Gateway]
    Agents[Agent Framework]
  end

  subgraph data [Data]
    Repos[Repositories]
    DB[(PostgreSQL + RLS)]
  end

  Pages --> Queries
  Pages --> Components
  Actions --> Services
  API --> Services
  Queries --> Services
  Services --> Repos
  Services --> Workflows
  Services --> AI
  Workflows --> Repos
  Agents --> AI
  Repos --> DB
```

---

## Event-Driven Flow

```mermaid
sequenceDiagram
  participant S as Service
  participant DB as domain_events
  participant Cron as dispatch-events
  participant WE as WorkflowEngine
  participant Jobs as workflow_jobs
  participant N8N as n8n

  S->>DB: INSERT event (pending)
  Cron->>DB: Poll pending events
  Cron->>WE: triggerFromDomainEvent()
  WE->>Jobs: Enqueue steps
  Cron->>Jobs: processJobQueue()
  Jobs->>N8N: dispatch_n8n action
  Jobs->>DB: Mark completed
```

---

## AI Request Flow

```mermaid
sequenceDiagram
  participant UI as UI / Action
  participant S as AIService
  participant DB as ai_requests
  participant Cron as execute route
  participant G as AI Gateway
  participant LLM as Provider

  UI->>S: requestTalentMatch()
  S->>DB: INSERT (pending)
  S->>DB: emit ai.match_requested
  Cron->>G: executeAiRequest()
  G->>LLM: complete / completeStructured
  LLM-->>G: response
  G->>DB: UPDATE ai_requests (completed)
```

---

## Multi-Tenant Isolation

```mermaid
flowchart LR
  Request[HTTP Request] --> Auth[Supabase Auth JWT]
  Auth --> Session[Session + tenant_id]
  Session --> RBAC[App RBAC Check]
  RBAC --> Service[Service Layer]
  Service --> RLS[PostgreSQL RLS]
  RLS --> Data[(Tenant-scoped data)]
```

---

## Agent Framework

```mermaid
flowchart TB
  subgraph config [Configuration]
    Registry[Agent Registry]
    DBConfig[agent_configs]
    Prompts[PromptManager]
  end

  subgraph runtime [Runtime]
    AS[AgentService]
    MCP[MCP Gateway]
    Memory[Agent Memory]
  end

  subgraph exec [Execution - Future]
    Loop[Tool-use Loop]
    Gateway[AI Gateway]
  end

  Registry --> AS
  DBConfig --> AS
  Prompts --> AS
  AS --> MCP
  AS --> Memory
  AS -.-> Loop
  Loop -.-> Gateway
  MCP -.-> Services
```

---

## Marketplace Layer (Planned)

```mermaid
flowchart TB
  subgraph marketplace [Marketplace Layer]
    Profiles[Profiles]
    Availability[Availability]
    Contracts[Contracts]
    Invites[Invitations]
    Recs[Recommendations]
  end

  subgraph existing [Existing Agency OS]
    Talent[freelancers]
    Opps[opportunities]
    Match[talent_match_scores]
    Projects[projects]
  end

  Profiles --> Talent
  Invites --> Opps
  Match --> Recs
  Contracts --> Projects
```

See [35-marketplace-architecture.md](./35-marketplace-architecture.md)

---

## Related

- [Architecture](./architecture.md)
- [11 Enterprise Architecture](./11-enterprise-system-architecture.md) — additional C4 diagrams
- [Events](./events.md)
- [Workflow](./workflow.md)
