#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
DB_NAME="${DB_DATABASE:-shahin_grc}"
DB_USER="${DB_USER:-dos_user}"
DB_HOST="${DB_HOST:-localhost}"
FORCE=false
DRY_RUN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") <backup-file.sql.gz> [OPTIONS]

Restores a database from a gzipped SQL backup.

Arguments:
  backup-file.sql.gz    Path to the backup file to restore

Options:
  --force              Skip confirmation prompt (for automation)
  --dry-run            Show what would be done without executing
  --help, -h           Show this help message

Examples:
  # Restore with confirmation
  $(basename "$0") /var/backups/dos-platform/shahin_grc_20260507_120000.sql.gz

  # Force restore without confirmation
  $(basename "$0") /var/backups/dos-platform/shahin_grc_20260507_120000.sql.gz --force

  # Dry run to preview
  $(basename "$0") /var/backups/dos-platform/shahin_grc_20260507_120000.sql.gz --dry-run
EOF
  exit 0
}

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    --dry-run) DRY_RUN=true ;;
    --help|-h) show_help ;;
  esac
done

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz> [--force] [--dry-run]"
  echo ""
  echo "Options:"
  echo "  --force    Skip confirmation prompt (for automation)"
  echo "  --dry-run  Show what would be done without executing"
  echo ""
  echo "Available backups:"
  ls -lh ${BACKUP_DIR:-/var/backups/dos-platform}/*.sql.gz 2>/dev/null || echo "  (none found)"
  exit 1
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Database Restore                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Source:   $BACKUP_FILE"
echo "  Target:   $DB_NAME"
echo ""

if [ "$FORCE" != "true" ]; then
  read -p "  ⚠  This will REPLACE the current database. Continue? (y/N) " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "  Aborted."
    exit 1
  fi
else
  echo "  ⚠  Force mode: skipping confirmation"
fi

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] Would execute:"
  echo "  1. Stop all services: pm2 stop all"
  echo "  2. Restore database from: $BACKUP_FILE"
  echo "  3. Run migrations: bash ops/scripts/run-migrations.sh"
  echo "  4. Restart services: pm2 start ops/ecosystem.all.config.js"
  exit 0
fi

echo "→ Stopping services..."
pm2 stop all 2>/dev/null || true

echo "→ Restoring database..."
gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME"

echo "→ Running migrations..."
bash ops/scripts/run-migrations.sh || true

echo "→ Restarting services..."
pm2 start ops/ecosystem.all.config.js

echo ""
echo "  ✓ Database restored from $BACKUP_FILE"
