#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/load-env.sh"

if [ -z "${DATABASE_URL:-}" ]; then
  dos_load_shared_env || true
fi

MIGRATION_NAME="${1:-}"
DRY_RUN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") <migration-filename> [OPTIONS]

Rolls back a platform migration using its rollback script.

Arguments:
  migration-filename    Name of the migration to rollback (e.g., 008_soft_delete_columns.sql)

Options:
  --dry-run            Show what would be done without executing
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL          PostgreSQL connection string

Examples:
  # Rollback a migration
  $(basename "$0") 008_soft_delete_columns.sql

  # Dry run to preview
  $(basename "$0") 008_soft_delete_columns.sql --dry-run

Note:
  Rollback scripts must exist in ops/migrations/rollback/<migration-name>
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h) show_help ;;
  esac
done

if [ -z "$MIGRATION_NAME" ]; then
  echo "Usage: $0 <migration-filename> [--dry-run]"
  echo "  Example: $0 008_soft_delete_columns.sql"
  echo "  Example: $0 008_soft_delete_columns.sql --dry-run"
  echo ""
  echo "Applied migrations:"
  psql "${DATABASE_URL}" -t -A -c "SELECT filename, applied_at FROM dos.schema_migrations ORDER BY id DESC LIMIT 10" 2>/dev/null || \
  psql "${DATABASE_URL}" -t -A -c "SELECT name, applied_at FROM dos.platform_migrations ORDER BY id DESC LIMIT 10" 2>/dev/null || \
  echo "  (could not query migration tables)"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

ROLLBACK_DIR="$REPO_ROOT/ops/migrations/rollback"
ROLLBACK_FILE="$ROLLBACK_DIR/$MIGRATION_NAME"

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Migration Rollback               ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] Would execute:"
  echo "  1. Run rollback script: $ROLLBACK_FILE"
  echo "  2. Remove migration record from dos.schema_migrations"
  echo "  3. Remove migration record from dos.platform_migrations"
  exit 0
fi

if [ -f "$ROLLBACK_FILE" ]; then
  echo "→ Running rollback script: $ROLLBACK_FILE"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "$ROLLBACK_FILE"
  echo "→ Removing migration record"
  psql "${DATABASE_URL}" -c "DELETE FROM dos.schema_migrations WHERE filename = '$MIGRATION_NAME'" 2>/dev/null || true
  psql "${DATABASE_URL}" -c "DELETE FROM dos.platform_migrations WHERE name = '$MIGRATION_NAME'" 2>/dev/null || true
  echo "✓ Rollback complete: $MIGRATION_NAME"
else
  echo "⚠  No rollback script found at $ROLLBACK_FILE"
  echo "   Create it manually, then re-run this command."
  echo ""
  echo "   Template:"
  echo "   -- $ROLLBACK_FILE"
  echo "   BEGIN;"
  echo "   -- DROP TABLE IF EXISTS ...;"
  echo "   -- ALTER TABLE ... DROP COLUMN ...;"
  echo "   COMMIT;"
  mkdir -p "$ROLLBACK_DIR"
  exit 1
fi
