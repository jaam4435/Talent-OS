-- Talent OS — Functions, Triggers & Business Logic
-- Depends on: 001_initial_schema.sql, 002_rls_policies.sql

-- =============================================================================
-- PROFILE AUTO-CREATE ON SIGNUP
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- ACTIVITY LOG HELPER
-- =============================================================================
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
  INSERT INTO activity_logs (tenant_id, actor_id, entity_type, entity_id, action, metadata)
  VALUES (p_tenant_id, p_actor_id, p_entity_type, p_entity_id, p_action, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- NOTIFICATION HELPER
-- =============================================================================
CREATE OR REPLACE FUNCTION create_notification(
  p_tenant_id UUID,
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (tenant_id, user_id, type, title, body, data)
  VALUES (p_tenant_id, p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- AUTO-CREATE PAYMENT ON MILESTONE APPROVAL
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_milestone_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_project projects%ROWTYPE;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT * INTO v_project FROM projects WHERE id = NEW.project_id;

    INSERT INTO payments (
      tenant_id, project_id, milestone_id, freelancer_id, amount, currency, status
    ) VALUES (
      NEW.tenant_id, NEW.project_id, NEW.id, v_project.freelancer_id,
      NEW.amount, v_project.currency, 'pending'
    )
    ON CONFLICT (milestone_id) DO NOTHING;

    -- Notify admin users
    PERFORM create_notification(
      NEW.tenant_id,
      tm.user_id,
      'payment_pending',
      'Payment pending approval',
      format('Milestone "%s" approved — payment of %s %s pending', NEW.title, NEW.amount, v_project.currency),
      jsonb_build_object('payment_milestone_id', NEW.id, 'project_id', NEW.project_id)
    )
    FROM tenant_members tm
    WHERE tm.tenant_id = NEW.tenant_id AND tm.role = 'admin' AND tm.status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_milestone_approved
  AFTER UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION handle_milestone_approved();

-- =============================================================================
-- LOG PROJECT STATUS CHANGES
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_project_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_activity(
      NEW.tenant_id,
      auth.uid(),
      'project',
      NEW.id,
      'status_changed',
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_project_status_change
  AFTER UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_project_status_change();

-- =============================================================================
-- LOG OPPORTUNITY RESPONSE
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_opportunity_response()
RETURNS TRIGGER AS $$
DECLARE
  v_opp opportunities%ROWTYPE;
  v_freelancer freelancers%ROWTYPE;
BEGIN
  IF NEW.response IS DISTINCT FROM OLD.response AND NEW.response != 'pending' THEN
    NEW.responded_at = now();

    SELECT * INTO v_opp FROM opportunities WHERE id = NEW.opportunity_id;
    SELECT * INTO v_freelancer FROM freelancers WHERE id = NEW.freelancer_id;

    -- Notify opportunity creator
    PERFORM create_notification(
      NEW.tenant_id,
      v_opp.created_by,
      'opportunity_response',
      format('%s responded to "%s"', v_freelancer.full_name, v_opp.title),
      format('Response: %s', NEW.response),
      jsonb_build_object('opportunity_id', NEW.opportunity_id, 'freelancer_id', NEW.freelancer_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_opportunity_response
  BEFORE UPDATE ON opportunity_recipients
  FOR EACH ROW EXECUTE FUNCTION handle_opportunity_response();

-- =============================================================================
-- ASSIGN PROJECT: UPDATE OPPORTUNITY STATUS
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_project_created()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.opportunity_id IS NOT NULL THEN
    UPDATE opportunities SET status = 'filled', updated_at = now()
    WHERE id = NEW.opportunity_id AND status != 'filled';

    -- Mark shortlist item as selected
    IF NEW.shortlist_id IS NOT NULL THEN
      UPDATE shortlist_items SET status = 'selected', updated_at = now()
      WHERE shortlist_id = NEW.shortlist_id AND freelancer_id = NEW.freelancer_id;

      UPDATE shortlist_items SET status = 'rejected', updated_at = now()
      WHERE shortlist_id = NEW.shortlist_id AND freelancer_id != NEW.freelancer_id AND status = 'active';
    END IF;
  END IF;

  -- Notify freelancer
  IF NEW.freelancer_id IS NOT NULL THEN
    PERFORM create_notification(
      NEW.tenant_id,
      f.user_id,
      'project_assigned',
      format('You have been assigned to "%s"', NEW.title),
      NEW.description,
      jsonb_build_object('project_id', NEW.id)
    )
    FROM freelancers f
    WHERE f.id = NEW.freelancer_id AND f.user_id IS NOT NULL;
  END IF;

  PERFORM log_activity(
    NEW.tenant_id, NEW.assigned_by, 'project', NEW.id, 'created',
    jsonb_build_object('freelancer_id', NEW.freelancer_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_project_created();

-- =============================================================================
-- TENANT ONBOARDING: CREATE TENANT + ADMIN MEMBER
-- =============================================================================
CREATE OR REPLACE FUNCTION create_tenant_with_admin(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO tenants (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_tenant_id;

  INSERT INTO tenant_members (tenant_id, user_id, role, status, joined_at)
  VALUES (v_tenant_id, p_user_id, 'admin', 'active', now());

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- INVITE FREELANCER: LINK OR CREATE
-- =============================================================================
CREATE OR REPLACE FUNCTION link_freelancer_to_user(
  p_freelancer_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE freelancers
  SET user_id = p_user_id, last_active_at = now(), updated_at = now()
  WHERE id = p_freelancer_id AND user_id IS NULL;

  -- Add freelancer role to tenant_members if not exists
  INSERT INTO tenant_members (tenant_id, user_id, role, status, joined_at)
  SELECT f.tenant_id, p_user_id, 'freelancer', 'active', now()
  FROM freelancers f
  WHERE f.id = p_freelancer_id
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = 'freelancer', status = 'active', joined_at = COALESCE(tenant_members.joined_at, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SEARCH FREELANCERS (full-text)
-- =============================================================================
CREATE OR REPLACE FUNCTION search_freelancers(
  p_tenant_id UUID,
  p_query TEXT DEFAULT NULL,
  p_discipline discipline_type DEFAULT NULL,
  p_availability availability_status DEFAULT NULL,
  p_min_rate NUMERIC DEFAULT NULL,
  p_max_rate NUMERIC DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF freelancers AS $$
  SELECT *
  FROM freelancers f
  WHERE f.tenant_id = p_tenant_id
    AND (p_query IS NULL OR (
      f.full_name ILIKE '%' || p_query || '%'
      OR f.email ILIKE '%' || p_query || '%'
      OR p_query = ANY(f.skills)
    ))
    AND (p_discipline IS NULL OR f.discipline = p_discipline)
    AND (p_availability IS NULL OR f.availability = p_availability)
    AND (p_min_rate IS NULL OR f.day_rate >= p_min_rate)
    AND (p_max_rate IS NULL OR f.day_rate <= p_max_rate)
  ORDER BY f.internal_rating DESC NULLS LAST, f.full_name
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- SUGGEST TALENT FOR OPPORTUNITY
-- =============================================================================
CREATE OR REPLACE FUNCTION suggest_talent_for_opportunity(p_opportunity_id UUID)
RETURNS TABLE (
  freelancer_id UUID,
  full_name TEXT,
  discipline discipline_type,
  day_rate NUMERIC,
  internal_rating NUMERIC,
  skill_match_count INTEGER
) AS $$
DECLARE
  v_opp opportunities%ROWTYPE;
BEGIN
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;

  RETURN QUERY
  SELECT
    f.id,
    f.full_name,
    f.discipline,
    f.day_rate,
    f.internal_rating,
    (
      SELECT count(*)::INTEGER
      FROM unnest(v_opp.required_skills) AS req(skill)
      WHERE req.skill = ANY(f.skills)
    ) AS skill_match_count
  FROM freelancers f
  WHERE f.tenant_id = v_opp.tenant_id
    AND f.availability = 'available'
    AND (v_opp.discipline IS NULL OR f.discipline = v_opp.discipline)
    AND f.id NOT IN (
      SELECT or2.freelancer_id FROM opportunity_recipients or2
      WHERE or2.opportunity_id = p_opportunity_id
    )
  ORDER BY skill_match_count DESC, f.internal_rating DESC NULLS LAST
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- DATABASE WEBHOOKS (for n8n)
-- These use Supabase Database Webhooks feature pointing to n8n endpoints.
-- Events: INSERT/UPDATE on key tables → POST to tenant n8n webhook URL
-- =============================================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE opportunity_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
