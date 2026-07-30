-- Talent OS — Marketplace Architecture (Schema Blueprint)
-- Depends on: 001, 009, 012, 017
-- Architecture only: tables prepared for future implementation phases.
-- See docs/35-marketplace-architecture.md

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE marketplace_visibility AS ENUM ('private', 'tenant', 'marketplace');

CREATE TYPE availability_block_type AS ENUM ('available', 'busy', 'booked', 'time_off');

CREATE TYPE marketplace_rating_source AS ENUM ('internal', 'client', 'peer', 'project_completion');

CREATE TYPE marketplace_contract_status AS ENUM (
  'draft', 'sent', 'viewed', 'signed', 'active', 'completed', 'terminated', 'canceled'
);

CREATE TYPE marketplace_contract_party_type AS ENUM ('agency', 'client', 'freelancer', 'witness');

CREATE TYPE marketplace_invitation_type AS ENUM ('broadcast', 'direct', 'application', 'marketplace');

CREATE TYPE marketplace_invitation_status AS ENUM (
  'pending', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn'
);

CREATE TYPE marketplace_match_source AS ENUM ('ai', 'rule_based', 'marketplace', 'manual');

CREATE TYPE marketplace_recommendation_type AS ENUM (
  'talent_for_opportunity', 'opportunity_for_talent', 'similar_talent', 're_engagement'
);

-- =============================================================================
-- PROFILE EXTENSIONS
-- =============================================================================
ALTER TABLE freelancers
  ADD COLUMN IF NOT EXISTS marketplace_visibility marketplace_visibility NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS marketplace_headline TEXT,
  ADD COLUMN IF NOT EXISTS marketplace_bio TEXT,
  ADD COLUMN IF NOT EXISTS marketplace_published_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_freelancers_public_slug
  ON freelancers(public_slug) WHERE public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_freelancers_marketplace_visible
  ON freelancers(tenant_id, marketplace_visibility)
  WHERE marketplace_visibility = 'marketplace';

-- =============================================================================
-- PORTFOLIO EXTENSIONS
-- =============================================================================
ALTER TABLE freelancer_portfolio_items
  ADD COLUMN IF NOT EXISTS is_marketplace_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_portfolio_marketplace_visible
  ON freelancer_portfolio_items(freelancer_id)
  WHERE is_marketplace_visible = true;

-- =============================================================================
-- AVAILABILITY BLOCKS
-- =============================================================================
CREATE TABLE talent_availability_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id   UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  block_type      availability_block_type NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  capacity_pct    INTEGER NOT NULL DEFAULT 100 CHECK (capacity_pct >= 0 AND capacity_pct <= 100),
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_availability_blocks_freelancer ON talent_availability_blocks(freelancer_id, starts_at, ends_at);
CREATE INDEX idx_availability_blocks_tenant ON talent_availability_blocks(tenant_id);

-- =============================================================================
-- MARKETPLACE RATINGS (public/client — separate from internal)
-- =============================================================================
CREATE TABLE marketplace_ratings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id   UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  source          marketplace_rating_source NOT NULL,
  rating          NUMERIC(2, 1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  reviewer_type   TEXT NOT NULL,
  reviewer_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  visibility      marketplace_visibility NOT NULL DEFAULT 'tenant',
  review_text     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_ratings_freelancer ON marketplace_ratings(freelancer_id, created_at DESC);
CREATE INDEX idx_marketplace_ratings_tenant ON marketplace_ratings(tenant_id);

-- =============================================================================
-- CONTRACTS
-- =============================================================================
CREATE TABLE marketplace_contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  opportunity_id  UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  status          marketplace_contract_status NOT NULL DEFAULT 'draft',
  title           TEXT NOT NULL,
  terms           JSONB NOT NULL DEFAULT '{}',
  document_path   TEXT,
  effective_date  DATE,
  expires_at      TIMESTAMPTZ,
  signed_at       TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_contracts_tenant ON marketplace_contracts(tenant_id, status);
CREATE INDEX idx_marketplace_contracts_project ON marketplace_contracts(project_id) WHERE project_id IS NOT NULL;

CREATE TABLE marketplace_contract_parties (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id           UUID NOT NULL REFERENCES marketplace_contracts(id) ON DELETE CASCADE,
  party_type            marketplace_contract_party_type NOT NULL,
  entity_type           TEXT NOT NULL,
  entity_id             UUID NOT NULL,
  signed_at             TIMESTAMPTZ,
  signature_reference   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, party_type, entity_id)
);

CREATE TABLE marketplace_contract_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES marketplace_contracts(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  actor_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_events_contract ON marketplace_contract_events(contract_id, created_at DESC);

-- =============================================================================
-- INVITATIONS (distinct from member_invites and opportunity_recipients)
-- =============================================================================
CREATE TABLE marketplace_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type            marketplace_invitation_type NOT NULL,
  opportunity_id  UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  freelancer_id   UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  listing_id      UUID,
  status          marketplace_invitation_status NOT NULL DEFAULT 'pending',
  proposal        JSONB,
  message         TEXT,
  expires_at      TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_invitations_tenant ON marketplace_invitations(tenant_id, status);
CREATE INDEX idx_marketplace_invitations_freelancer ON marketplace_invitations(freelancer_id, status);
CREATE INDEX idx_marketplace_invitations_opportunity ON marketplace_invitations(opportunity_id)
  WHERE opportunity_id IS NOT NULL;

-- =============================================================================
-- RECOMMENDATIONS
-- =============================================================================
CREATE TABLE marketplace_recommendations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type                marketplace_recommendation_type NOT NULL,
  source_entity_type  TEXT NOT NULL,
  source_entity_id    UUID NOT NULL,
  target_entity_type  TEXT NOT NULL,
  target_entity_id    UUID NOT NULL,
  score               NUMERIC(5, 2) NOT NULL CHECK (score >= 0 AND score <= 100),
  rationale           TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  expires_at          TIMESTAMPTZ,
  dismissed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketplace_recommendations_tenant ON marketplace_recommendations(tenant_id, type);
CREATE INDEX idx_marketplace_recommendations_source ON marketplace_recommendations(tenant_id, source_entity_type, source_entity_id);
CREATE INDEX idx_marketplace_recommendations_active ON marketplace_recommendations(tenant_id, created_at DESC)
  WHERE dismissed_at IS NULL;

-- =============================================================================
-- MATCHING EXTENSIONS
-- =============================================================================
ALTER TABLE talent_match_scores
  ADD COLUMN IF NOT EXISTS match_source marketplace_match_source NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS match_context JSONB NOT NULL DEFAULT '{}';

-- =============================================================================
-- RPC: Availability check (stub for future implementation)
-- =============================================================================
CREATE OR REPLACE FUNCTION check_talent_availability(
  p_freelancer_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ
)
RETURNS TABLE (
  available BOOLEAN,
  conflicting_block_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    NOT EXISTS (
      SELECT 1 FROM talent_availability_blocks b
      WHERE b.freelancer_id = p_freelancer_id
        AND b.block_type IN ('busy', 'booked', 'time_off')
        AND b.starts_at < p_ends_at
        AND b.ends_at > p_starts_at
    ) AS available,
    (
      SELECT count(*)::INTEGER FROM talent_availability_blocks b
      WHERE b.freelancer_id = p_freelancer_id
        AND b.block_type IN ('busy', 'booked', 'time_off')
        AND b.starts_at < p_ends_at
        AND b.ends_at > p_starts_at
    ) AS conflicting_block_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- RLS (stubs — full policies in implementation phase)
-- =============================================================================
ALTER TABLE talent_availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_contract_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_blocks_manager" ON talent_availability_blocks FOR ALL TO authenticated
  USING (is_manager_of(tenant_id))
  WITH CHECK (is_manager_of(tenant_id));

CREATE POLICY "availability_blocks_own" ON talent_availability_blocks FOR ALL TO authenticated
  USING (freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid()))
  WITH CHECK (freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid()));

CREATE POLICY "marketplace_ratings_select_manager" ON marketplace_ratings FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "marketplace_ratings_insert" ON marketplace_ratings FOR INSERT TO authenticated
  WITH CHECK (is_manager_of(tenant_id) OR reviewer_id = auth.uid());

CREATE POLICY "marketplace_contracts_manager" ON marketplace_contracts FOR ALL TO authenticated
  USING (is_manager_of(tenant_id))
  WITH CHECK (is_manager_of(tenant_id));

CREATE POLICY "marketplace_contract_parties_select" ON marketplace_contract_parties FOR SELECT TO authenticated
  USING (contract_id IN (SELECT id FROM marketplace_contracts WHERE is_manager_of(tenant_id)));

CREATE POLICY "marketplace_contract_events_select" ON marketplace_contract_events FOR SELECT TO authenticated
  USING (contract_id IN (SELECT id FROM marketplace_contracts WHERE is_manager_of(tenant_id)));

CREATE POLICY "marketplace_invitations_manager" ON marketplace_invitations FOR ALL TO authenticated
  USING (is_manager_of(tenant_id))
  WITH CHECK (is_manager_of(tenant_id));

CREATE POLICY "marketplace_invitations_freelancer" ON marketplace_invitations FOR SELECT TO authenticated
  USING (freelancer_id IN (SELECT id FROM freelancers WHERE user_id = auth.uid()));

CREATE POLICY "marketplace_recommendations_manager" ON marketplace_recommendations FOR ALL TO authenticated
  USING (is_manager_of(tenant_id))
  WITH CHECK (is_manager_of(tenant_id));

CREATE TRIGGER trg_availability_blocks_updated_at
  BEFORE UPDATE ON talent_availability_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_marketplace_contracts_updated_at
  BEFORE UPDATE ON marketplace_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_marketplace_invitations_updated_at
  BEFORE UPDATE ON marketplace_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

REVOKE ALL ON FUNCTION check_talent_availability FROM PUBLIC;

COMMENT ON TABLE talent_availability_blocks IS 'Structured availability calendar blocks';
COMMENT ON TABLE marketplace_ratings IS 'Public/client ratings — separate from internal manager ratings';
COMMENT ON TABLE marketplace_contracts IS 'Engagement contracts linked to opportunities/projects';
COMMENT ON TABLE marketplace_invitations IS 'Marketplace gig invitations with proposals — not team invites';
COMMENT ON TABLE marketplace_recommendations IS 'Proactive talent/opportunity recommendations';
