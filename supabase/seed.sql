-- Talent OS — Development seed data
-- Run after migrations: supabase db reset (applies migrations + seed)
-- Or: psql $DATABASE_URL -f supabase/seed.sql
--
-- Demo auth users (password: password123) — create via Supabase Auth or signup UI:
--   admin@demo.agency      → admin
--   manager@demo.agency    → talent_manager (admin-equivalent for agency ops)
--   talent@demo.agency     → freelancer (talent)
--   client@acme.com        → client (Acme Corp)

-- Fixed IDs for reproducible local dev
-- Tenant
INSERT INTO tenants (id, name, slug, currency, subscription_status)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Demo Creative Agency',
  'demo-agency',
  'USD',
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- Companies (end clients)
INSERT INTO companies (id, tenant_id, name, slug, contact_email, contact_name, website)
VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Acme Corp',
    'acme-corp',
    'projects@acme.com',
    'Jane Acme',
    'https://acme.example'
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Northwind Studios',
    'northwind-studios',
    'creative@northwind.example',
    'Alex North',
    'https://northwind.example'
  )
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- Talent profiles (freelancers table)
INSERT INTO freelancers (
  id, tenant_id, email, full_name, discipline, skills, day_rate, currency,
  bio, availability, internal_rating, tags
)
VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'alex.chen@talent.example',
    'Alex Chen',
    'video',
    ARRAY['premiere pro', 'after effects', 'color grading'],
    650.00,
    'USD',
    'Senior video editor specializing in brand campaigns.',
    'available',
    4.5,
    ARRAY['video', 'campaign']
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'maya.patel@talent.example',
    'Maya Patel',
    'design',
    ARRAY['figma', 'brand identity', 'ui design'],
    550.00,
    'USD',
    'Brand and UI designer with agency background.',
    'busy',
    4.8,
    ARRAY['design', 'branding']
  ),
  (
    'c0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'sam.ortiz@talent.example',
    'Sam Ortiz',
    'copy',
    ARRAY['copywriting', 'seo', 'social media'],
    400.00,
    'USD',
    'Conversion-focused copywriter for digital campaigns.',
    'available',
    4.2,
    ARRAY['copy', 'content']
  )
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Opportunities
INSERT INTO opportunities (
  id, tenant_id, created_by, title, description, budget, currency,
  required_skills, discipline, company_id, client_name, status
)
SELECT
  'd0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  p.id,
  'Acme Summer Campaign Video',
  '60-second hero video for summer product launch. Needs motion graphics and color grade.',
  12000.00,
  'USD',
  ARRAY['video', 'after effects'],
  'video',
  'b0000000-0000-4000-8000-000000000001',
  'Acme Corp',
  'open'
FROM profiles p
WHERE p.email = 'admin@demo.agency'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Projects (only if we have a profile to assign_by; skip if no auth users yet)
INSERT INTO projects (
  id, tenant_id, opportunity_id, freelancer_id, assigned_by, title, description,
  company_id, client_name, budget, currency, status
)
SELECT
  'e0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  p.id,
  'Acme Summer Campaign Video',
  'Production and post-production for hero video.',
  'b0000000-0000-4000-8000-000000000001',
  'Acme Corp',
  12000.00,
  'USD',
  'active'
FROM profiles p
WHERE p.email IN ('admin@demo.agency', 'manager@demo.agency')
LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO milestones (project_id, tenant_id, title, amount, sort_order, status, due_date)
SELECT
  'e0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  m.title,
  m.amount,
  m.sort_order,
  m.status::milestone_status,
  m.due_date
FROM (
  VALUES
    ('Storyboard & rough cut', 4000.00, 1, 'in_progress', CURRENT_DATE + 14),
    ('Final delivery', 8000.00, 2, 'pending', CURRENT_DATE + 30)
) AS m(title, amount, sort_order, status, due_date)
WHERE EXISTS (SELECT 1 FROM projects WHERE id = 'e0000000-0000-4000-8000-000000000001')
  AND NOT EXISTS (
    SELECT 1 FROM milestones WHERE project_id = 'e0000000-0000-4000-8000-000000000001'
  );

-- Second project for Northwind
INSERT INTO projects (
  id, tenant_id, freelancer_id, assigned_by, title, description,
  company_id, client_name, budget, currency, status
)
SELECT
  'e0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002',
  p.id,
  'Northwind Brand Refresh',
  'Logo evolution and brand guidelines.',
  'b0000000-0000-4000-8000-000000000002',
  'Northwind Studios',
  8500.00,
  'USD',
  'active'
FROM profiles p
WHERE p.email IN ('admin@demo.agency', 'manager@demo.agency')
LIMIT 1
ON CONFLICT (id) DO NOTHING;
