#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/load-env.sh"

if [ -z "${DATABASE_URL:-}" ]; then
  dos_load_shared_env || true
fi

SERVICE_NAME="${1:-}"
MIGRATION_NAME="${2:-}"
DRY_RUN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") <service-name> <migration-filename> [OPTIONS]

Rolls back a service migration using its rollback script.

Arguments:
  service-name         Name of the service
  migration-filename    Name of the migration to rollback (e.g., 001_auth_tables.sql)

Options:
  --dry-run            Show what would be done without executing
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL          PostgreSQL connection string

Examples:
  # Rollback a service migration
  $(basename "$0") auth-service 001_auth_tables.sql

  # List applied migrations for a service
  $(basename "$0") auth-service --list

  # Dry run to preview
  $(basename "$0") auth-service 001_auth_tables.sql --dry-run
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h) show_help ;;
  esac
done

if [ -z "$SERVICE_NAME" ] || [ -z "$MIGRATION_NAME" ]; then
  echo "Usage: $0 <service-name> <migration-filename> [--dry-run]"
  echo "  Example: $0 auth-service 001_auth_tables.sql"
  echo "  Example: $0 auth-service 001_auth_tables.sql --dry-run"
  echo ""
  echo "  Lists applied migrations for a service:"
  echo "    $0 <service-name> --list"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Service Migration Rollback       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

if [ "$MIGRATION_NAME" = "--list" ]; then
  echo "  Applied migrations for $SERVICE_NAME:"
  psql "${DATABASE_URL}" -t -A -c \
    "SELECT filename, applied_at, execution_time_ms FROM dos.service_migrations WHERE service_code = '$SERVICE_NAME' ORDER BY id DESC LIMIT 20" \
    2>/dev/null || echo "  (migration table not found)"
  exit 0
fi

echo "  Service:   $SERVICE_NAME"
echo "  Migration: $MIGRATION_NAME"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] Would execute:"
  echo "  1. Run rollback script: $ROLLBACK_FILE"
  echo "  2. Remove migration record from dos.service_migrations"
  exit 0
fi

ROLLBACK_DIR="$REPO_ROOT/services/$SERVICE_NAME/migrations/rollback"
ROLLBACK_FILE="$ROLLBACK_DIR/${MIGRATION_NAME%.sql}_rollback.sql"

if [ -f "$ROLLBACK_FILE" ]; then
  echo "→ Running rollback script: $ROLLBACK_FILE"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "$ROLLBACK_FILE"
  echo "→ Removing migration record"
  psql "${DATABASE_URL}" -c "DELETE FROM dos.service_migrations WHERE service_code = '$SERVICE_NAME' AND filename = '$MIGRATION_NAME'"
  echo "✓ Rollback complete"
else
  echo "⚠  No rollback script found at $ROLLBACK_FILE"
  echo "   Creating rollback directory and template..."
  mkdir -p "$ROLLBACK_DIR"
  cat > "$ROLLBACK_FILE" <<SQL
-- Rollback: $MIGRATION_NAME for $SERVICE_NAME
BEGIN;
-- TODO: Add rollback SQL (DROP TABLE, DROP INDEX, etc.)
-- Example:
--   DROP TABLE IF EXISTS dos.${SERVICE_NAME//-/_}_example CASCADE;
COMMIT;
SQL
  echo "   Template created at: $ROLLBACK_FILE"
  echo "   Edit it and re-run this command."
  exit 1
fi
