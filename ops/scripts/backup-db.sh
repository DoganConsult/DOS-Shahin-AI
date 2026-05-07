#!/bin/bash
# Database backup with retention
# Usage: ./backup-db.sh [database-name]

set -e

DB_NAME=${1:-shahin_grc}
BACKUP_DIR="/root/DOS-Platform/backups/db"
RETENTION_DAYS=30

echo "═══ Database Backup: $DB_NAME ═══"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

# Perform backup
echo "Backing up $DB_NAME to $BACKUP_FILE..."
PGPASSWORD=$DOS_MIGRATOR_PASS pg_dump -h localhost -U dos_migrator -d "$DB_NAME | gzip > "$BACKUP_FILE"

echo "✓ Backup complete: $BACKUP_FILE"

# Clean up old backups (retain last 30 days)
echo "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "${DB_NAME}_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR" | grep "${DB_NAME}_backup_" || echo "  No backups found"
