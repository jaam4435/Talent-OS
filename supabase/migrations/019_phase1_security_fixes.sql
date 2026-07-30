-- Phase 1: Security fixes for privileged RPCs (CORE-02, CORE-03)
-- Ensures callers can only act on their own user ID.

CREATE OR REPLACE FUNCTION public.create_tenant_with_admin(
  p_name TEXT,
  p_slug TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_caller UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Cannot create tenant for another user';
  END IF;

  INSERT INTO tenants (name, slug)
  VALUES (p_name, p_slug)
  RETURNING id INTO v_tenant_id;

  INSERT INTO tenant_members (tenant_id, user_id, role, status, joined_at)
  VALUES (v_tenant_id, p_user_id, 'admin', 'active', now());

  RETURN v_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_freelancer_to_user(
  p_freelancer_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_caller <> p_user_id THEN
    RAISE EXCEPTION 'Cannot link freelancer to another user';
  END IF;

  UPDATE freelancers
  SET user_id = p_user_id, last_active_at = now(), updated_at = now()
  WHERE id = p_freelancer_id AND user_id IS NULL;

  INSERT INTO tenant_members (tenant_id, user_id, role, status, joined_at)
  SELECT f.tenant_id, p_user_id, 'freelancer', 'active', now()
  FROM freelancers f
  WHERE f.id = p_freelancer_id
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = 'freelancer', status = 'active', joined_at = COALESCE(tenant_members.joined_at, now());
END;
$$;
