-- Talent OS — Domain Purity P2 (Sprint 23)
-- Depends on: 001–035
-- Addresses DATABASE_ALIGNMENT_REPORT.md §9 P2

-- =============================================================================
-- 1. OPPORTUNITIES — soft delete columns
-- =============================================================================
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE opportunity_recipients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_opportunities_active
  ON opportunities (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opp_recipients_active
  ON opportunity_recipients (opportunity_id)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- 2. COMPANIES — dedupe names then enforce unique lower(name) per tenant
-- =============================================================================
WITH ranked AS (
  SELECT
    id,
    tenant_id,
    lower(name) AS lname,
    row_number() OVER (PARTITION BY tenant_id, lower(name) ORDER BY created_at ASC, id ASC) AS rn
  FROM companies
  WHERE deleted_at IS NULL
)
UPDATE companies c
SET
  name = c.name || ' (' || substr(c.id::text, 1, 8) || ')',
  slug = c.slug || '-' || substr(c.id::text, 1, 8),
  updated_at = now()
FROM ranked r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_tenant_name_unique
  ON companies (tenant_id, lower(name))
  WHERE deleted_at IS NULL;

-- =============================================================================
-- 3. CRM CONTRACTS — signed status requires signed_at
-- =============================================================================
ALTER TABLE crm_contracts
  DROP CONSTRAINT IF EXISTS crm_contracts_signed_at_required;

ALTER TABLE crm_contracts
  ADD CONSTRAINT crm_contracts_signed_at_required
  CHECK (status <> 'signed' OR signed_at IS NOT NULL);

-- =============================================================================
-- 4. ACTIVITY LOGS — deprecate writes for module-covered entities
-- =============================================================================
COMMENT ON FUNCTION log_activity(UUID, UUID, TEXT, UUID, TEXT, JSONB) IS
  'Legacy activity stream. Module audit tables (*_audit_logs) are canonical for bounded-context entities since Sprint 23.';

CREATE OR REPLACE FUNCTION log_activity(
  p_tenant_id UUID,
  p_actor_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_entity_type = ANY(
    ARRAY['project', 'milestone', 'company', 'lead', 'deal', 'contract', 'freelancer', 'assignment', 'payment', 'crm_lead', 'crm_deal', 'crm_company']
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO activity_logs (tenant_id, actor_id, entity_type, entity_id, action, metadata)
  VALUES (p_tenant_id, p_actor_id, p_entity_type, p_entity_id, p_action, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 5. ANALYTICS VIEWS — exclude soft-deleted opportunities
-- =============================================================================
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  t.id AS tenant_id,
  (SELECT count(*) FROM freelancers f WHERE f.tenant_id = t.id) AS total_freelancers,
  (SELECT count(*) FROM projects p WHERE p.tenant_id = t.id AND p.status IN ('active', 'in_review') AND p.deleted_at IS NULL) AS active_projects,
  (SELECT count(*) FROM opportunities o WHERE o.tenant_id = t.id AND o.status = 'open' AND o.deleted_at IS NULL) AS open_opportunities,
  (SELECT count(*) FROM payments pay WHERE pay.tenant_id = t.id AND pay.status = 'pending') AS pending_payments,
  (SELECT coalesce(sum(pay.amount), 0) FROM payments pay WHERE pay.tenant_id = t.id AND pay.status = 'pending') AS pending_payments_amount
FROM tenants t;

CREATE OR REPLACE VIEW v_opportunity_fill_rate AS
SELECT
  tenant_id,
  date_trunc('month', created_at) AS month,
  count(*) AS total_opportunities,
  count(*) FILTER (WHERE status = 'filled') AS filled_opportunities,
  CASE
    WHEN count(*) > 0
    THEN round(count(*) FILTER (WHERE status = 'filled') * 100.0 / count(*), 1)
    ELSE 0
  END AS fill_rate_pct
FROM opportunities
WHERE deleted_at IS NULL
GROUP BY tenant_id, date_trunc('month', created_at);

CREATE OR REPLACE VIEW v_response_metrics AS
SELECT
  o.tenant_id,
  date_trunc('week', o.created_at) AS week,
  count(DISTINCT or2.id) AS total_broadcasts,
  count(DISTINCT or2.id) FILTER (WHERE or2.response != 'pending') AS total_responses,
  count(DISTINCT or2.id) FILTER (WHERE or2.response = 'interested') AS interested_count,
  CASE
    WHEN count(DISTINCT or2.id) > 0
    THEN round(count(DISTINCT or2.id) FILTER (WHERE or2.response != 'pending') * 100.0 / count(DISTINCT or2.id), 1)
    ELSE 0
  END AS response_rate_pct
FROM opportunities o
JOIN opportunity_recipients or2 ON or2.opportunity_id = o.id AND or2.deleted_at IS NULL
WHERE o.status IN ('open', 'closed', 'filled')
  AND o.deleted_at IS NULL
GROUP BY o.tenant_id, date_trunc('week', o.created_at);
