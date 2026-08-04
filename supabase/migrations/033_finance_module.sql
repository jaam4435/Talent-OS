-- Sprint 17: Finance module audit trail
-- Immutable payment mutation log (approve, mark-paid)

CREATE TABLE finance_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_id        UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  actor_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  before_state      JSONB,
  after_state       JSONB,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_audit_payment ON finance_audit_logs(tenant_id, payment_id, created_at DESC);
CREATE INDEX idx_finance_audit_tenant ON finance_audit_logs(tenant_id, created_at DESC);

ALTER TABLE finance_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_audit_select" ON finance_audit_logs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "finance_audit_insert" ON finance_audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

COMMENT ON TABLE finance_audit_logs IS 'Immutable finance module audit trail for payment mutations';
