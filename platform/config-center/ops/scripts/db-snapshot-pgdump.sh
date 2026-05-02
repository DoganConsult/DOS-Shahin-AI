#!/usr/bin/env bash
# Off-box-style pg_dump in custom format (-Fc). Requires DATABASE_URL or PG* vars.
set -euo pipefail

: "${BACKUP_DIR:?Set BACKUP_DIR to a directory outside the DB data volume}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found in PATH" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%d_%H%M%S)"
DB_NAME="${PGDATABASE:-${DATABASE_URL##*/}}"
DB_NAME="${DB_NAME%%\?*}"
OUT="${BACKUP_DIR}/dos_platform_${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump --format=custom --no-owner --no-acl --dbname="${DATABASE_URL}" --file="${OUT}"
else
  pg_dump --format=custom --no-owner --no-acl --file="${OUT}"
fi

echo "Wrote ${OUT}"
ls -lh "${OUT}"
