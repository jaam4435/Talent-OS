-- Talent OS — Analytics Views & Seed Data
-- Depends on: 001, 002, 003

-- =============================================================================
-- ANALYTICS VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  t.id AS tenant_id,
  (SELECT count(*) FROM freelancers f WHERE f.tenant_id = t.id) AS total_freelancers,
  (SELECT count(*) FROM projects p WHERE p.tenant_id = t.id AND p.status IN ('active', 'in_review')) AS active_projects,
  (SELECT count(*) FROM opportunities o WHERE o.tenant_id = t.id AND o.status = 'open') AS open_opportunities,
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
GROUP BY tenant_id, date_trunc('month', created_at);

CREATE OR REPLACE VIEW v_freelancer_utilization AS
SELECT
  f.tenant_id,
  f.id AS freelancer_id,
  f.full_name,
  f.discipline,
  f.internal_rating,
  f.availability,
  count(DISTINCT p.id) FILTER (WHERE p.created_at > now() - interval '90 days') AS projects_90d,
  coalesce(sum(pay.amount) FILTER (WHERE pay.status = 'paid' AND pay.paid_at > now() - interval '90 days'), 0) AS paid_90d,
  max(p.created_at) AS last_project_at
FROM freelancers f
LEFT JOIN projects p ON p.freelancer_id = f.id
LEFT JOIN payments pay ON pay.freelancer_id = f.id
GROUP BY f.tenant_id, f.id, f.full_name, f.discipline, f.internal_rating, f.availability;

CREATE OR REPLACE VIEW v_payment_aging AS
SELECT
  tenant_id,
  status,
  count(*) AS payment_count,
  coalesce(sum(amount), 0) AS total_amount,
  round(avg(extract(epoch FROM (now() - created_at)) / 86400)::numeric, 1) AS avg_days_in_status
FROM payments
WHERE status IN ('pending', 'approved', 'processing')
GROUP BY tenant_id, status;

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
JOIN opportunity_recipients or2 ON or2.opportunity_id = o.id
WHERE o.status IN ('open', 'closed', 'filled')
GROUP BY o.tenant_id, date_trunc('week', o.created_at);

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('tenant-logos', 'tenant-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('deliverables', 'deliverables', false, 52428800, NULL),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "tenant_logos_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-logos');

CREATE POLICY "tenant_logos_write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-logos'
    AND (storage.foldername(name))[1]::uuid IN (SELECT auth.admin_tenant_ids())
  );

CREATE POLICY "deliverables_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'deliverables'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT auth.manager_tenant_ids())
      OR (storage.foldername(name))[2]::uuid IN (SELECT auth.user_freelancer_ids())
    )
  );

CREATE POLICY "deliverables_write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'deliverables'
    AND (
      (storage.foldername(name))[1]::uuid IN (SELECT auth.manager_tenant_ids())
      OR (storage.foldername(name))[2]::uuid IN (SELECT auth.user_freelancer_ids())
    )
  );

CREATE POLICY "avatars_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- GRANT VIEW ACCESS
-- =============================================================================
GRANT SELECT ON v_dashboard_summary TO authenticated;
GRANT SELECT ON v_opportunity_fill_rate TO authenticated;
GRANT SELECT ON v_freelancer_utilization TO authenticated;
GRANT SELECT ON v_payment_aging TO authenticated;
GRANT SELECT ON v_response_metrics TO authenticated;
