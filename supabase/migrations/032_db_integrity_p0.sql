-- Talent OS — Database Integrity P0 (Sprint 10)
-- Depends on: 027 (assignment_allocations), 015/030 (whatsapp), 006 (member_invites)
-- Enforces domain invariants identified in DATABASE_ALIGNMENT_REPORT.md §9 P0

-- =============================================================================
-- 1. ASSIGNMENT ALLOCATION TARGET (XOR: project OR opportunity, not both/neither)
-- =============================================================================

-- Prefer project when both targets were set (legacy bad data)
UPDATE assignment_allocations
SET opportunity_id = NULL
WHERE project_id IS NOT NULL
  AND opportunity_id IS NOT NULL
  AND deleted_at IS NULL;

-- Soft-delete allocations with no target (invalid aggregate state)
UPDATE assignment_allocations
SET deleted_at = COALESCE(deleted_at, now())
WHERE project_id IS NULL
  AND opportunity_id IS NULL
  AND deleted_at IS NULL;

ALTER TABLE assignment_allocations
  DROP CONSTRAINT IF EXISTS assignment_allocation_target_xor;

ALTER TABLE assignment_allocations
  ADD CONSTRAINT assignment_allocation_target_xor
  CHECK (
    (project_id IS NOT NULL AND opportunity_id IS NULL)
    OR (project_id IS NULL AND opportunity_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_assignment_allocations_opportunity
  ON assignment_allocations (opportunity_id)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- 2. MEMBER INVITES — pending-only unique email per tenant
-- =============================================================================

ALTER TABLE member_invites
  DROP CONSTRAINT IF EXISTS member_invites_tenant_id_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_invites_pending_email
  ON member_invites (tenant_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- =============================================================================
-- 3. WHATSAPP — link messages and memory to conversations
-- =============================================================================

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL;

ALTER TABLE whatsapp_memory_entries
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE;

-- Ensure conversations exist for freelancers referenced in messages
INSERT INTO whatsapp_conversations (tenant_id, freelancer_id, phone)
SELECT DISTINCT
  wm.tenant_id,
  wm.freelancer_id,
  wm.phone
FROM whatsapp_messages wm
WHERE wm.freelancer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM whatsapp_conversations wc
    WHERE wc.tenant_id = wm.tenant_id
      AND wc.freelancer_id = wm.freelancer_id
  )
ON CONFLICT (tenant_id, freelancer_id) DO NOTHING;

-- Backfill message conversation_id via freelancer session
UPDATE whatsapp_messages wm
SET conversation_id = wc.id
FROM whatsapp_conversations wc
WHERE wm.conversation_id IS NULL
  AND wm.freelancer_id IS NOT NULL
  AND wc.tenant_id = wm.tenant_id
  AND wc.freelancer_id = wm.freelancer_id;

-- Fallback: match by tenant + phone for messages without freelancer_id
UPDATE whatsapp_messages wm
SET conversation_id = wc.id
FROM whatsapp_conversations wc
WHERE wm.conversation_id IS NULL
  AND wc.tenant_id = wm.tenant_id
  AND wc.phone = wm.phone;

-- Ensure conversations for memory entries (use freelancer phone or latest message phone)
INSERT INTO whatsapp_conversations (tenant_id, freelancer_id, phone)
SELECT DISTINCT
  wme.tenant_id,
  wme.freelancer_id,
  COALESCE(
    NULLIF(f.phone, ''),
    (
      SELECT wm.phone
      FROM whatsapp_messages wm
      WHERE wm.tenant_id = wme.tenant_id
        AND wm.freelancer_id = wme.freelancer_id
      ORDER BY wm.created_at DESC
      LIMIT 1
    ),
    '+0000000000'
  )
FROM whatsapp_memory_entries wme
JOIN freelancers f ON f.id = wme.freelancer_id
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_conversations wc
  WHERE wc.tenant_id = wme.tenant_id
    AND wc.freelancer_id = wme.freelancer_id
)
ON CONFLICT (tenant_id, freelancer_id) DO NOTHING;

UPDATE whatsapp_memory_entries wme
SET conversation_id = wc.id
FROM whatsapp_conversations wc
WHERE wme.conversation_id IS NULL
  AND wc.tenant_id = wme.tenant_id
  AND wc.freelancer_id = wme.freelancer_id;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation
  ON whatsapp_messages (conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_memory_conversation
  ON whatsapp_memory_entries (conversation_id, created_at DESC)
  WHERE conversation_id IS NOT NULL;

-- Memory entries always have freelancer_id; require conversation link going forward
ALTER TABLE whatsapp_memory_entries
  ALTER COLUMN conversation_id SET NOT NULL;

COMMENT ON COLUMN whatsapp_messages.conversation_id IS 'FK to whatsapp_conversations — populated on inbound/outbound insert';
COMMENT ON COLUMN whatsapp_memory_entries.conversation_id IS 'FK to whatsapp_conversations — scopes turn history per session';
