-- Sprint 18: Notifications module — preferences + list index

CREATE TABLE notification_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'in_app',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, category, channel)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(tenant_id, user_id);
CREATE INDEX idx_notifications_tenant_user_created ON notifications(tenant_id, user_id, created_at DESC);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select_own" ON notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY "notification_preferences_manage_own" ON notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid() AND tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (user_id = auth.uid() AND tenant_id IN (SELECT public.user_tenant_ids()));

DROP TRIGGER IF EXISTS trg_notification_preferences_updated ON notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE notification_preferences IS 'Per-user notification category and channel preferences';
