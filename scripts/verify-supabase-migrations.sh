#!/usr/bin/env bash
# Verify Supabase migrations including Platform Core (022).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PROJECT_REF="${SUPABASE_PROJECT_REF:-rzjyqjwldmdldinoxgvh}"
if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Usage: SUPABASE_DB_PASSWORD='...' ./scripts/verify-supabase-migrations.sh"
  exit 1
fi
ENCODED_PW="$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$SUPABASE_DB_PASSWORD")"
POOLER_HOST="${SUPABASE_POOLER_HOST:-aws-1-ap-southeast-1.pooler.supabase.com}"
POOLER_PORT="${SUPABASE_POOLER_PORT:-5432}"
DB_URL="postgresql://postgres.${PROJECT_REF}:${ENCODED_PW}@${POOLER_HOST}:${POOLER_PORT}/postgres"
echo "=== Platform Core tables (migration 022) ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('platform_feature_flags', 'platform_config')
  ORDER BY 1;"
echo "=== P0 spot-check ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -Atc "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('api_idempotency_responses', 'platform_log_entries', 'workflow_runs')
  ORDER BY 1;"
