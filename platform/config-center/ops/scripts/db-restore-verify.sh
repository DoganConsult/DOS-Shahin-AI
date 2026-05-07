#!/usr/bin/env bash
# Restore drill: pg_restore into RESTORE_URL then row-count proof.
# WARNING: Drops public+dos objects on target when CLEAN_RESTORE=1 (default for throwaway DBs).
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Performs pg_restore into target database and runs row-count proof.

Options:
  --help, -h           Show this help message

Environment Variables:
  RESTORE_URL          Target PostgreSQL URL (required)
  DUMP_FILE            pg_dump -Fc artifact (required)
  CLEAN_RESTORE        Drop schemas before restore (default: 1)

Warning:
  Drops public+dos objects on target when CLEAN_RESTORE=1.

Examples:
  # Restore with clean slate
  RESTORE_URL=postgresql://... DUMP_FILE=/path/to/dump $(basename "$0)

  # Restore without dropping schemas
  CLEAN_RESTORE=0 RESTORE_URL=postgresql://... DUMP_FILE=/path/to/dump $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

: "${RESTORE_URL:?Set RESTORE_URL to target postgres URL (throwaway DB)}"
: "${DUMP_FILE:?Set DUMP_FILE to pg_dump -Fc artifact}"

CLEAN_RESTORE="${CLEAN_RESTORE:-1}"

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore not found in PATH" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SQL="${ROOT}/ops/scripts/sql/row-count-proof.sql"

if [[ ! -f "${SQL}" ]]; then
  echo "Missing ${SQL}" >&2
  exit 1
fi

if [[ "${CLEAN_RESTORE}" == "1" ]]; then
  psql "${RESTORE_URL}" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS dos CASCADE; DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; CREATE SCHEMA dos;"
fi

pg_restore --dbname="${RESTORE_URL}" --no-owner --no-acl --jobs=4 "${DUMP_FILE}"

psql "${RESTORE_URL}" -v ON_ERROR_STOP=1 -f "${SQL}"

echo "Restore + row-count proof completed OK"
