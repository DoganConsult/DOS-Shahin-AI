#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/load-env.sh"

if [ -z "${DATABASE_URL:-}" ]; then
  dos_load_shared_env || true
fi

# ╔══════════════════════════════════════════════════╗
# ║  DOS Platform — Backup Verification              ║
# ║  Restores the latest backup to a temporary DB    ║
# ║  and validates data integrity. Non-interactive.  ║
# ╚══════════════════════════════════════════════════╝

BACKUP_DIR="${BACKUP_DIR:-/var/backups/dos-platform}"
DB_USER="${DB_USER:-dos_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERIFY_DB="dos_backup_verify_${TIMESTAMP}"
BACKUP_FILE="${1:-}"
RESULT="FAIL"
ERRORS=""

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Backup Verification              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Find backup file
if [ -z "$BACKUP_FILE" ]; then
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)
  if [ -z "$BACKUP_FILE" ]; then
    echo "ERROR: No backup files found in $BACKUP_DIR"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FAIL — no backup files found" >> "$BACKUP_DIR/verify.log" 2>/dev/null || true
    exit 1
  fi
fi

echo "  Backup file: $BACKUP_FILE"
echo "  Verify DB:   $VERIFY_DB"
echo ""

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "  Backup size: $BACKUP_SIZE"
echo ""

cleanup() {
  echo "→ Cleaning up: dropping $VERIFY_DB"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS \"$VERIFY_DB\";" 2>/dev/null || true
}

# Always cleanup on exit
trap cleanup EXIT

# Step 1: Create temporary database
echo "→ Step 1: Creating temporary database $VERIFY_DB"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
  -c "CREATE DATABASE \"$VERIFY_DB\";" 2>/dev/null

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to create temporary database"
  exit 1
fi

# Step 2: Restore backup into temp DB
echo "→ Step 2: Restoring backup into $VERIFY_DB"
gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$VERIFY_DB" \
  --quiet 2>/dev/null

if [ $? -ne 0 ]; then
  ERRORS="$ERRORS restore_failed;"
  echo "  ⚠  Restore completed with errors (non-fatal for verification)"
fi

# Step 3: Run validation queries
echo "→ Step 3: Validating restored data"

CONN="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $VERIFY_DB -t -A"

# Check 3a: dos schema exists
DOS_SCHEMA=$(psql $CONN -c "SELECT count(*) FROM pg_namespace WHERE nspname = 'dos';" 2>/dev/null || echo "0")
if [ "$DOS_SCHEMA" = "1" ]; then
  echo "  ✓ dos schema exists"
else
  echo "  ✗ dos schema missing"
  ERRORS="$ERRORS dos_schema_missing;"
fi

# Check 3b: tenants table has rows
TENANT_COUNT=$(psql $CONN -c "SELECT count(*) FROM public.tenants;" 2>/dev/null || echo "0")
echo "  ✓ Tenants: $TENANT_COUNT rows"
if [ "$TENANT_COUNT" = "0" ]; then
  ERRORS="$ERRORS tenants_empty;"
fi

# Check 3c: users table has rows
USER_COUNT=$(psql $CONN -c "SELECT count(*) FROM public.users;" 2>/dev/null || echo "0")
echo "  ✓ Users: $USER_COUNT rows"
if [ "$USER_COUNT" = "0" ]; then
  ERRORS="$ERRORS users_empty;"
fi

# Check 3d: config_definitions exists and has rows
CONFIG_COUNT=$(psql $CONN -c "SELECT count(*) FROM dos.config_definitions;" 2>/dev/null || echo "0")
echo "  ✓ Config definitions: $CONFIG_COUNT rows"

# Check 3e: table count in dos schema
DOS_TABLE_COUNT=$(psql $CONN -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'dos';" 2>/dev/null || echo "0")
echo "  ✓ Tables in dos schema: $DOS_TABLE_COUNT"
if [ "$DOS_TABLE_COUNT" -lt 10 ]; then
  echo "  ⚠  Expected at least 10 tables in dos schema"
  ERRORS="$ERRORS dos_tables_low;"
fi

# Check 3f: migration tracking
MIGRATION_COUNT=$(psql $CONN -c "SELECT count(*) FROM public.schema_migrations;" 2>/dev/null || echo "?")
echo "  ✓ Applied migrations: $MIGRATION_COUNT"

# Step 4: Determine result
if [ -z "$ERRORS" ]; then
  RESULT="PASS"
fi

echo ""
echo "── Verification Result ─────────────────────────────"
echo "  Backup:   $(basename "$BACKUP_FILE")"
echo "  Size:     $BACKUP_SIZE"
echo "  Tenants:  $TENANT_COUNT"
echo "  Users:    $USER_COUNT"
echo "  Configs:  $CONFIG_COUNT"
echo "  Tables:   $DOS_TABLE_COUNT (dos schema)"
echo "  Result:   $RESULT"
if [ -n "$ERRORS" ]; then
  echo "  Errors:   $ERRORS"
fi
echo ""

# Log result
LOG_ENTRY="[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $RESULT — backup=$(basename "$BACKUP_FILE") size=$BACKUP_SIZE tenants=$TENANT_COUNT users=$USER_COUNT tables=$DOS_TABLE_COUNT"
echo "$LOG_ENTRY" >> "$BACKUP_DIR/verify.log" 2>/dev/null || true

if [ "$RESULT" = "FAIL" ]; then
  exit 1
fi
exit 0
