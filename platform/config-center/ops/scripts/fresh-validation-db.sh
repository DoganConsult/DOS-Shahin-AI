#!/usr/bin/env bash
# Recreate the validation database pointed at by DATABASE_URL.
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Recreates the validation database for schema verification.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (required)

Safety:
  - Refuses to touch shared dev DB (shahin_grc)
  - Refuses to touch any DB with prod/production in name
  - Parse-only — no wildcard matching

Examples:
  # Recreate validation DB
  DATABASE_URL=postgresql://localhost:5432/validation_db $(basename "$0)

Note:
  Mirrors CI reset at .github/workflows/ci.yml for identical verification.
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

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
