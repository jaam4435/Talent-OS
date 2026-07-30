# Marketplace Platform Architecture

Independent marketplace platform with three bounded contexts: **Supply**, **Demand**, and **Matching**. Extends the agency OS without duplicating business logic.

## Platform Topology

```
                    MarketplaceService (facade)
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   SupplyPlatform       DemandPlatform       MatchingPlatform
        │                     │                     │
   profile              CRMService            matching
   availability         ProjectService        recommendation
   portfolio            InviteService         capacity
   contract                                   reputation (ratings)
   rating
```

## Supply Side

| Capability | Service | Repository | Extends |
|------------|---------|------------|---------|
| Talent profiles | `MarketplaceProfileService` | `MarketplaceProfileRepository` | `freelancers` marketplace columns |
| Availability | `MarketplaceAvailabilityService` | `AvailabilityBlockRepository` | `talent_availability_blocks` + RPC |
| Portfolio | `MarketplacePortfolioService` | profile repo | `is_marketplace_visible`, `featured` |
| Contracts | `MarketplaceContractService` | `MarketplaceContractRepository` | contract lifecycle tables |
| Ratings / Reputation | `MarketplaceRatingService` | `MarketplaceRatingRepository` | `marketplace_ratings` |

Private talent CRUD remains in `TalentService`. Marketplace services add visibility, public views, and engagement layers.

## Demand Side

| Capability | Service | Notes |
|------------|---------|-------|
| Clients | `CRMService` | `companies` — reused directly |
| Opportunities | `CRMService` | tenant-private lifecycle |
| Projects | `ProjectService` | delivery stack |
| Invitations | `MarketplaceInviteService` | `marketplace_invitations` with proposals |

Demand context does **not** duplicate CRM/project logic — `DemandPlatform` holds references to existing services plus marketplace-specific invitations.

## Matching Context

| Capability | Service | Notes |
|------------|---------|-------|
| AI Matching | `MarketplaceMatchingService` | `tenant` pool → `AIService`; `marketplace`/`combined` → rule-based + roster |
| Recommendations | `MarketplaceRecommendationService` | proactive `marketplace_recommendations` |
| Reputation | `MarketplaceRatingService` | aggregated ratings feed match ranking |
| Capacity Planning | `MarketplaceCapacityService` | supply vs demand snapshot |

### Candidate pools

| Pool | Source |
|------|--------|
| `tenant` | Existing AI match pipeline (`AIService.requestTalentMatch`) |
| `marketplace` | Published/marketplace-visible roster |
| `combined` | Full tenant roster with rule-based scoring |

## Layering Rules

1. **MCP / UI → MarketplaceService → subdomain service → repository → DB**
2. **Never** call `TalentService` or `CRMService` from repositories
3. **Reuse** agency OS services for private operations; marketplace services add cross-cutting visibility and engagement
4. Migration `018_marketplace_architecture.sql` defines schema; services in `lib/marketplace/services/` are the runtime layer

## Events

| Event | Emitter |
|-------|---------|
| `marketplace.profile_published` | ProfileService |
| `marketplace.invitation_sent` | InviteService |
| `marketplace.application_received` | InviteService |
| `marketplace.contract_signed` | ContractService |
| `marketplace.recommendation_generated` | RecommendationService |
| `marketplace.match_completed` | MatchingService |

## File Map

```
lib/marketplace/
  platform/
    supply.ts          # Supply context interface
    demand.ts          # Demand context interface
    matching.ts        # Matching context interface
  services/
    profile.service.ts
    availability.service.ts
    rating.service.ts
    portfolio.service.ts
    contract.service.ts
    invite.service.ts
    matching.service.ts
    recommendation.service.ts
    capacity.service.ts
lib/repositories/marketplace/
  profile.repository.ts
  availability-block.repository.ts
  rating.repository.ts
  contract.repository.ts
  invitation.repository.ts
  recommendation.repository.ts
lib/services/marketplace.service.ts   # Composite facade
modules/marketplace/
  types.ts, interfaces.ts, validation.ts, events/
supabase/migrations/018_marketplace_architecture.sql
```

## Future (out of scope)

- Cross-tenant RLS helpers and public discovery routes
- E-sign integration for contracts
- UI for marketplace browsing
- Cron worker for recommendation generation
