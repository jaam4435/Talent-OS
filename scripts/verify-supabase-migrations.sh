#!/usr/bin/env bash
# Verify which Supabase migrations are applied on the remote project.
# Requires SUPABASE_DB_PASSWORD (same as push-supabase-schema.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-rzjyqjwldmdldinoxgvh}"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Error: SUPABASE_DB_PASSWORD is not set."
  echo "Usage: SUPABASE_DB_PASSWORD='your-db-password' ./scripts/verify-supabase-migrations.sh"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql is required. Install postgresql-client."
  exit 1
fi

ENCODED_PW="$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$SUPABASE_DB_PASSWORD")"
POOLER_HOST="${SUPABASE_POOLER_HOST:-aws-1-ap-southeast-1.pooler.supabase.com}"
POOLER_PORT="${SUPABASE_POOLER_PORT:-5432}"
DB_URL="postgresql://postgres.${PROJECT_REF}:${ENCODED_PW}@${POOLER_HOST}:${POOLER_PORT}/postgres"

echo "=== Remote migration history (supabase_migrations.schema_migrations) ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc "
  SELECT version || ' — ' || name
  FROM supabase_migrations.schema_migrations
  ORDER BY version;
" 2>/dev/null || echo "(schema_migrations table not found — project may predate CLI tracking)"

echo ""
echo "=== Platform Core tables (PR-00 / migration 022) ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'platform_product_registry',
      'platform_feature_flags',
      'platform_config'
    )
  ORDER BY table_name;
"

echo ""
echo "=== P0 tables spot-check (migrations 014–021) ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'workflow_runs',
      'workflow_jobs',
      'whatsapp_conversations',
      'knowledge_entries',
      'agent_configs',
      'platform_log_entries',
      'api_idempotency_responses'
    )
  ORDER BY table_name;
"

echo ""
echo "=== Seeded products (expect talent_os enabled) ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "
  SELECT product_id, enabled FROM platform_product_registry ORDER BY product_id;
" 2>/dev/null || echo "(platform_product_registry not present — apply migration 022)"

echo ""
echo "Done."
