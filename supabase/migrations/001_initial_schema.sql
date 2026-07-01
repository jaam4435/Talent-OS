-- Talent OS — Initial Schema Migration
-- Run order: 001 → 002 → 003 → 004

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE user_role AS ENUM ('admin', 'talent_manager', 'freelancer');
CREATE TYPE member_status AS ENUM ('invited', 'active', 'suspended');
CREATE TYPE discipline_type AS ENUM ('design', 'video', 'copy', 'motion', 'brand', 'other');
CREATE TYPE availability_status AS ENUM ('available', 'busy', 'unavailable');
CREATE TYPE opportunity_status AS ENUM ('draft', 'open', 'closed', 'filled', 'canceled');
CREATE TYPE response_type AS ENUM ('pending', 'interested', 'declined');
CREATE TYPE shortlist_status AS ENUM ('open', 'finalized', 'archived');
CREATE TYPE shortlist_item_status AS ENUM ('active', 'selected', 'rejected');
CREATE TYPE project_status AS ENUM ('draft', 'active', 'in_review', 'completed', 'archived', 'canceled');
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'submitted', 'approved', 'revision', 'canceled');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'processing', 'paid', 'disputed', 'canceled');
CREATE TYPE notification_type AS ENUM (
  'opportunity_broadcast', 'opportunity_response', 'project_assigned',
  'milestone_submitted', 'milestone_approved', 'milestone_revision',
  'payment_pending', 'payment_approved', 'payment_paid', 'system'
);

-- =============================================================================
-- TENANTS
-- =============================================================================
CREATE TABLE tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  logo_url            TEXT,
  timezone            TEXT NOT NULL DEFAULT 'UTC',
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  settings            JSONB NOT NULL DEFAULT '{}',
  subscription_status TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at       TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_subscription ON tenants(subscription_status);

-- =============================================================================
-- PROFILES (extends auth.users)
-- =============================================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- =============================================================================
-- TENANT MEMBERS
-- =============================================================================
CREATE TABLE tenant_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  status      member_status NOT NULL DEFAULT 'active',
  invited_at  TIMESTAMPTZ,
  joined_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_role ON tenant_members(tenant_id, role);

-- =============================================================================
-- FREELANCERS
-- =============================================================================
CREATE TABLE freelancers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  discipline        discipline_type NOT NULL,
  skills            TEXT[] NOT NULL DEFAULT '{}',
  day_rate          NUMERIC(12, 2),
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  bio               TEXT,
  portfolio_url     TEXT,
  availability      availability_status NOT NULL DEFAULT 'available',
  internal_rating   NUMERIC(2, 1) CHECK (internal_rating >= 1.0 AND internal_rating <= 5.0),
  internal_notes    TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  metadata          JSONB NOT NULL DEFAULT '{}',
  last_active_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_freelancers_tenant ON freelancers(tenant_id);
CREATE INDEX idx_freelancers_discipline ON freelancers(tenant_id, discipline);
CREATE INDEX idx_freelancers_availability ON freelancers(tenant_id, availability);
CREATE INDEX idx_freelancers_skills ON freelancers USING GIN(skills);
CREATE INDEX idx_freelancers_tags ON freelancers USING GIN(tags);
CREATE INDEX idx_freelancers_user ON freelancers(user_id) WHERE user_id IS NOT NULL;

-- =============================================================================
-- OPPORTUNITIES
-- =============================================================================
CREATE TABLE opportunities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  title               TEXT NOT NULL,
  description         TEXT,
  budget              NUMERIC(12, 2),
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  required_skills     TEXT[] NOT NULL DEFAULT '{}',
  discipline          discipline_type,
  client_name         TEXT,
  deadline            DATE,
  response_deadline   TIMESTAMPTZ,
  status              opportunity_status NOT NULL DEFAULT 'draft',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX idx_opportunities_status ON opportunities(tenant_id, status);
CREATE INDEX idx_opportunities_created_by ON opportunities(created_by);

-- =============================================================================
-- OPPORTUNITY RECIPIENTS
-- =============================================================================
CREATE TABLE opportunity_recipients (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id      UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  freelancer_id       UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  response            response_type NOT NULL DEFAULT 'pending',
  response_note       TEXT,
  responded_at        TIMESTAMPTZ,
  whatsapp_sent_at    TIMESTAMPTZ,
  whatsapp_delivered  BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, freelancer_id)
);

CREATE INDEX idx_opp_recipients_opportunity ON opportunity_recipients(opportunity_id);
CREATE INDEX idx_opp_recipients_freelancer ON opportunity_recipients(freelancer_id);
CREATE INDEX idx_opp_recipients_tenant ON opportunity_recipients(tenant_id);
CREATE INDEX idx_opp_recipients_response ON opportunity_recipients(tenant_id, response);

-- =============================================================================
-- SHORTLISTS
-- =============================================================================
CREATE TABLE shortlists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id  UUID NOT NULL UNIQUE REFERENCES opportunities(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  status          shortlist_status NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shortlists_tenant ON shortlists(tenant_id);

-- =============================================================================
-- SHORTLIST ITEMS
-- =============================================================================
CREATE TABLE shortlist_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlist_id      UUID NOT NULL REFERENCES shortlists(id) ON DELETE CASCADE,
  freelancer_id     UUID NOT NULL REFERENCES freelancers(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rank              INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  status            shortlist_item_status NOT NULL DEFAULT 'active',
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shortlist_id, freelancer_id)
);

CREATE INDEX idx_shortlist_items_shortlist ON shortlist_items(shortlist_id);
CREATE INDEX idx_shortlist_items_freelancer ON shortlist_items(freelancer_id);

-- =============================================================================
-- PROJECTS
-- =============================================================================
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id  UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  shortlist_id    UUID REFERENCES shortlists(id) ON DELETE SET NULL,
  freelancer_id   UUID NOT NULL REFERENCES freelancers(id),
  assigned_by     UUID NOT NULL REFERENCES profiles(id),
  title           TEXT NOT NULL,
  description     TEXT,
  client_name     TEXT,
  budget          NUMERIC(12, 2),
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  status          project_status NOT NULL DEFAULT 'draft',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_freelancer ON projects(freelancer_id);
CREATE INDEX idx_projects_status ON projects(tenant_id, status);
CREATE INDEX idx_projects_opportunity ON projects(opportunity_id);

-- =============================================================================
-- MILESTONES
-- =============================================================================
CREATE TABLE milestones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  amount            NUMERIC(12, 2) NOT NULL,
  due_date          DATE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  status            milestone_status NOT NULL DEFAULT 'pending',
  submission_note   TEXT,
  submission_files  JSONB NOT NULL DEFAULT '[]',
  submitted_at      TIMESTAMPTZ,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES profiles(id),
  review_note       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_milestones_tenant ON milestones(tenant_id);
CREATE INDEX idx_milestones_status ON milestones(tenant_id, status);
CREATE INDEX idx_milestones_due_date ON milestones(due_date) WHERE status NOT IN ('approved', 'canceled');

-- =============================================================================
-- PAYMENTS
-- =============================================================================
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id        UUID NOT NULL UNIQUE REFERENCES milestones(id) ON DELETE CASCADE,
  freelancer_id       UUID NOT NULL REFERENCES freelancers(id),
  amount              NUMERIC(12, 2) NOT NULL,
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  status              payment_status NOT NULL DEFAULT 'pending',
  approved_by         UUID REFERENCES profiles(id),
  approved_at         TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  payment_reference   TEXT,
  dispute_reason      TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_freelancer ON payments(freelancer_id);
CREATE INDEX idx_payments_status ON payments(tenant_id, status);
CREATE INDEX idx_payments_project ON payments(project_id);

-- =============================================================================
-- ACTIVITY LOGS
-- =============================================================================
CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(tenant_id, created_at DESC);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB NOT NULL DEFAULT '{}',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);

-- =============================================================================
-- WHATSAPP MESSAGES
-- =============================================================================
CREATE TABLE whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  freelancer_id   UUID REFERENCES freelancers(id) ON DELETE SET NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  wa_message_id   TEXT,
  phone           TEXT NOT NULL,
  template_name   TEXT,
  body            TEXT,
  status          TEXT NOT NULL DEFAULT 'queued',
  entity_type     TEXT,
  entity_id       UUID,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX idx_wa_messages_wa_id ON whatsapp_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX idx_wa_messages_freelancer ON whatsapp_messages(freelancer_id);

-- =============================================================================
-- INTEGRATION CONFIGS
-- =============================================================================
CREATE TABLE integration_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,
  config            JSONB NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_verified_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);

CREATE INDEX idx_integration_configs_tenant ON integration_configs(tenant_id);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_freelancers_updated_at BEFORE UPDATE ON freelancers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shortlists_updated_at BEFORE UPDATE ON shortlists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shortlist_items_updated_at BEFORE UPDATE ON shortlist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_integration_configs_updated_at BEFORE UPDATE ON integration_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
