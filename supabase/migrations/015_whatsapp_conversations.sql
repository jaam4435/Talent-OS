-- WhatsApp conversation context for first-class messaging interface
-- Depends on: 001 (whatsapp_messages), 014 (workflow engine)

CREATE TABLE whatsapp_conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id     UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  phone             TEXT NOT NULL,
  active_intent     TEXT,
  active_entity_type TEXT,
  active_entity_id  UUID,
  context           JSONB NOT NULL DEFAULT '{}',
  last_message_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, freelancer_id)
);

CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(tenant_id, phone);
CREATE INDEX idx_whatsapp_conversations_active ON whatsapp_conversations(tenant_id, active_entity_type, active_entity_id)
  WHERE active_entity_id IS NOT NULL;

ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_conversations_select_manager" ON whatsapp_conversations FOR SELECT TO authenticated
  USING (is_manager_of(tenant_id));

CREATE POLICY "whatsapp_conversations_select_own" ON whatsapp_conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM freelancers f
      WHERE f.id = whatsapp_conversations.freelancer_id
        AND f.user_id = auth.uid()
    )
  );

COMMENT ON TABLE whatsapp_conversations IS 'Per-freelancer WhatsApp session context and active entity tracking';
