#!/usr/bin/env bash
# Recreate the validation database pointed at by DATABASE_URL.
#
# Mirrors the CI reset at .github/workflows/ci.yml:392-397 so local and CI
# schema verification run against an identical, guaranteed-empty DB. Used
# by `pnpm run verify:schema:fresh`.
#
# Safety: refuses to touch shared dev (shahin_grc) or anything whose DB
# name matches prod/production. Parse-only — no wildcard matching.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[fresh-validation-db] DATABASE_URL is required." >&2
  exit 1
fi

# Extract the components with node's URL parser to avoid fragile shell regex.
eval "$(node -e '
  const u = new URL(process.env.DATABASE_URL);
  const q = s => `'\''${String(s).replace(/'\''/g, `'\''\\'\'''\''`)}'\''`;
  process.stdout.write(`PG_HOST=${q(u.hostname)}\n`);
  process.stdout.write(`PG_PORT=${q(u.port || "5432")}\n`);
  process.stdout.write(`PG_USER=${q(decodeURIComponent(u.username || ""))}\n`);
  process.stdout.write(`PG_PASSWORD=${q(decodeURIComponent(u.password || ""))}\n`);
  process.stdout.write(`PG_DB=${q(u.pathname.replace(/^\//, ""))}\n`);
')"

if [[ -z "$PG_DB" ]]; then
  echo "[fresh-validation-db] DATABASE_URL has no database name." >&2
  exit 1
fi

lower_db="${PG_DB,,}"
if [[ "$lower_db" == "shahin_grc" ]]; then
  echo "[fresh-validation-db] REFUSING: DATABASE_URL points at shared dev DB 'shahin_grc'." >&2
  exit 2
fi
if [[ "$lower_db" == *prod* || "$lower_db" == *production* ]]; then
  echo "[fresh-validation-db] REFUSING: DATABASE_URL name '$PG_DB' looks like prod." >&2
  exit 2
fi

export PGPASSWORD="$PG_PASSWORD"
PSQL_ADMIN=(psql -v ON_ERROR_STOP=1 -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres)

echo "[fresh-validation-db] Dropping + recreating $PG_DB on $PG_HOST:$PG_PORT as $PG_USER"
"${PSQL_ADMIN[@]}" -c "DROP DATABASE IF EXISTS \"$PG_DB\";"
"${PSQL_ADMIN[@]}" -c "CREATE DATABASE \"$PG_DB\";"
echo "[fresh-validation-db] Ready: $PG_DB is empty."
