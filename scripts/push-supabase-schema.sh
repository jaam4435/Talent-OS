#!/usr/bin/env bash
# Push local migrations (001–011) to the linked Supabase project.
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
DB_URL="postgresql://postgres:${ENCODED_PW}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "Pushing migrations to db.${PROJECT_REF}.supabase.co ..."
npx supabase db push --db-url "$DB_URL" --yes

if [[ "${RUN_SEED:-}" == "1" ]]; then
  echo "Running seed.sql ..."
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
fi

echo "Done. Schema is up to date on remote Supabase."
