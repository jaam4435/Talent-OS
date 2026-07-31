#!/usr/bin/env bash
# Push local migrations (001–020) to the linked Supabase project.
# Requires the database password from Dashboard → Project Settings → Database.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT_REF="${SUPABASE_PROJECT_REF:-rzjyqjwldmdldinoxgvh}"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Error: SUPABASE_DB_PASSWORD is not set."
  echo "Find it in Supabase Dashboard → Project Settings → Database → Database password"
  echo ""
  echo "Usage:"
  echo "  SUPABASE_DB_PASSWORD='your-db-password' ./scripts/push-supabase-schema.sh"
  exit 1
fi

# Percent-encode password for connection URL (basic handling)
ENCODED_PW="$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$SUPABASE_DB_PASSWORD")"
# Pooler host (IPv4) — ap-southeast-1 session pooler
POOLER_HOST="${SUPABASE_POOLER_HOST:-aws-1-ap-southeast-1.pooler.supabase.com}"
POOLER_PORT="${SUPABASE_POOLER_PORT:-5432}"
DB_URL="postgresql://postgres.${PROJECT_REF}:${ENCODED_PW}@${POOLER_HOST}:${POOLER_PORT}/postgres"

echo "Pushing migrations to ${POOLER_HOST}:${POOLER_PORT} ..."
npx supabase db push --db-url "$DB_URL" --yes

if [[ "${RUN_SEED:-}" == "1" ]]; then
  echo "Running seed.sql ..."
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
fi

echo "Done. Schema is up to date on remote Supabase."
