#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/dos-platform}"
DB_NAME="${DB_DATABASE:-shahin_grc}"
DB_USER="${DB_USER:-dos_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${RETENTION_DAYS:-30}
MODE="logical"

show_help() {
  cat <<EOF
Usage: $(basename "$0") [--base-backup] [OPTIONS]

Creates database backups (logical pg_dump or base backup for PITR).

Options:
  --base-backup        Create base backup for PITR (requires WAL archiving)
  --help, -h           Show this help message

Environment Variables:
  BACKUP_DIR           Backup directory (default: /var/backups/dos-platform)
  DB_DATABASE          Database name (default: shahin_grc)
  DB_USER              Database user (default: dos_user)
  DB_HOST              Database host (default: localhost)
  DB_PORT              Database port (default: 5432)
  RETENTION_DAYS       Backup retention in days (default: 30)

Examples:
  # Create logical backup
  $(basename "$0)

  # Create base backup for PITR
  $(basename "$0) --base-backup

  # Custom backup directory
  BACKUP_DIR=/custom/backups $(basename "$0)

Note:
  Base backups require WAL archiving to be enabled in PostgreSQL.
EOF
  exit 0
}

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --base-backup) MODE="base" ;;
    --help|-h) show_help ;;
  esac
done

mkdir -p "$BACKUP_DIR"

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Database Backup                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Database: $DB_NAME"
echo "  Mode:     $MODE"
echo ""

if [ "$MODE" = "base" ]; then
  # Base backup for PITR (requires WAL archiving enabled)
  BASE_DIR="$BACKUP_DIR/base_${TIMESTAMP}"
  echo "  Output:   $BASE_DIR"
  echo ""

  echo "→ Creating base backup (for PITR)..."
  pg_basebackup -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
    -D "$BASE_DIR" -Ft -z -P --checkpoint=fast

  SIZE=$(du -sh "$BASE_DIR" | cut -f1)
  echo "  ✓ Base backup created: $SIZE"
  echo ""
  echo "  To restore with PITR:"
  echo "    bash ops/scripts/pitr-restore.sh '<target-time>' $BASE_DIR"
else
  # Logical backup (pg_dump)
  BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
  echo "  Output:   $BACKUP_FILE"
  echo ""

  echo "→ Creating logical backup..."
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl --clean --if-exists \
    | gzip > "$BACKUP_FILE"

  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "  ✓ Backup created: $SIZE"
  echo ""
  echo "  To restore: gunzip -c $BACKUP_FILE | psql -h $DB_HOST -U $DB_USER -d $DB_NAME"
fi

echo "→ Cleaning backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "  ✓ Removed $DELETED old logical backups"

# Clean old base backups too
OLD_BASE=$(find "$BACKUP_DIR" -maxdepth 1 -name "base_*" -type d -mtime +$RETENTION_DAYS -print 2>/dev/null | wc -l)
if [ "$OLD_BASE" -gt 0 ]; then
  find "$BACKUP_DIR" -maxdepth 1 -name "base_*" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
  echo "  ✓ Removed $OLD_BASE old base backups"
fi
