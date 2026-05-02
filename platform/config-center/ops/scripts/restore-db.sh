#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
DB_NAME="${DB_DATABASE:-shahin_grc}"
DB_USER="${DB_USER:-dos_user}"
DB_HOST="${DB_HOST:-localhost}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
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

read -p "  ⚠  This will REPLACE the current database. Continue? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "  Aborted."
  exit 1
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
