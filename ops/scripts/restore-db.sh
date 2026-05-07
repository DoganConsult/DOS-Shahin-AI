#!/bin/bash
# Database restore from backup
# Usage: ./restore-db.sh <backup-file>

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  echo "Available backups:"
  ls -lh /root/DOS-Platform/backups/db/ | grep "_backup_" || echo "  No backups found"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "═══ Database Restore ═══"
echo "Backup file: $BACKUP_FILE"

# Confirm restore
read -p "This will replace the current database. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Perform restore
echo "Restoring database..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD=$DOS_MIGRATOR_PASS psql -h localhost -U dos_migrator -d shahin_grc

echo "✓ Database restore complete"
