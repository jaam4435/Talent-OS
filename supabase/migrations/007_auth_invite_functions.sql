-- Sprint 1: Member invite accept/revoke and public preview

CREATE OR REPLACE FUNCTION public.get_invite_preview(p_token_hash TEXT)
RETURNS TABLE (
  invite_id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  email TEXT,
  role user_role,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.id,
    mi.tenant_id,
    t.name,
    mi.email,
    mi.role,
    mi.expires_at,
    (
      mi.accepted_at IS NULL
      AND mi.revoked_at IS NULL
      AND mi.expires_at > now()
    ) AS is_valid
  FROM member_invites mi
  JOIN tenants t ON t.id = mi.tenant_id
  WHERE mi.token_hash = p_token_hash
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_member_invite(
  p_token_hash TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite member_invites%ROWTYPE;
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM profiles WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  SELECT * INTO v_invite
  FROM member_invites
  WHERE token_hash = p_token_hash
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITE_INVALID';
  END IF;

  IF lower(v_invite.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'INVITE_EMAIL_MISMATCH';
  END IF;

  INSERT INTO tenant_members (tenant_id, user_id, role, status, invited_at, joined_at)
  VALUES (v_invite.tenant_id, p_user_id, v_invite.role, 'active', v_invite.created_at, now())
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET
      role = EXCLUDED.role,
      status = 'active',
      joined_at = COALESCE(tenant_members.joined_at, now());

  UPDATE member_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN v_invite.tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_member_invite(
  p_invite_id UUID,
  p_actor_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT mi.tenant_id INTO v_tenant_id
  FROM member_invites mi
  WHERE mi.id = p_invite_id
    AND mi.accepted_at IS NULL
    AND mi.revoked_at IS NULL;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'INVITE_NOT_FOUND';
  END IF;

  IF NOT public.is_tenant_admin(p_actor_id, v_tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE member_invites
  SET revoked_at = now()
  WHERE id = p_invite_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invite_preview(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_member_invite(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_member_invite(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_invite_preview(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_member_invite(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_member_invite(UUID, UUID) TO authenticated;
