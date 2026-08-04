-- Pre-migration report: duplicate company names per tenant (run before 036)
-- Usage: psql $DATABASE_URL -f scripts/cleanup-duplicate-companies.sql

SELECT
  tenant_id,
  lower(name) AS normalized_name,
  count(*) AS duplicate_count,
  array_agg(name ORDER BY created_at) AS names,
  array_agg(id ORDER BY created_at) AS ids
FROM companies
WHERE deleted_at IS NULL
GROUP BY tenant_id, lower(name)
HAVING count(*) > 1
ORDER BY duplicate_count DESC, tenant_id;

-- Migration 036 renames duplicates (keeps oldest) automatically.
-- To manually merge instead, update FK references to the keeper id before deleting duplicates.
