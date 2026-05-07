#!/usr/bin/env bash
set -euo pipefail

# ╔════════════════════════════════════════════════╗
# ║  DOS Platform — Point-in-Time Recovery (PITR)    ║
# ║  Restores PostgreSQL to a specific timestamp     ║
# ║  using base backup + WAL replay.                 ║
# ╚══════════════════════════════════════════════════╝

TARGET_TIME="${1:-}"
BASE_BACKUP_DIR="${2:-}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/backups/dos-platform/wal}"
PG_DATA="${PG_DATA:-/var/lib/postgresql/16/main}"
FORCE=false
DRY_RUN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") <target-time> <base-backup-dir> [OPTIONS]

Restores PostgreSQL to a specific timestamp using base backup + WAL replay.

Arguments:
  target-time          ISO 8601 timestamp (e.g., '2026-04-13 14:30:00 UTC')
  base-backup-dir      Path to pg_basebackup output directory

Options:
  --force              Skip confirmation prompt (for automation)
  --dry-run            Show what would be done without executing
  --help, -h           Show this help message

Environment Variables:
  WAL_ARCHIVE_DIR      WAL archive directory (default: /var/backups/dos-platform/wal)
  PG_DATA              PostgreSQL data directory (default: /var/lib/postgresql/16/main)

Examples:
  # Restore with confirmation
  $(basename "$0") '2026-04-13 14:30:00 UTC' /var/backups/dos-platform/base_20260413_020000

  # Force restore without confirmation
  $(basename "$0") '2026-04-13 14:30:00 UTC' /var/backups/dos-platform/base_20260413_020000 --force

  # Dry run to preview
  $(basename "$0") '2026-04-13 14:30:00 UTC' /var/backups/dos-platform/base_20260413_020000 --dry-run

Prerequisites:
  - WAL archiving must be enabled (see ops/postgresql/wal-archiving.conf)
  - A base backup must exist (created with: bash ops/scripts/backup-db.sh --base-backup)
  - WAL files must exist in WAL_ARCHIVE_DIR
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

if [ -z "$TARGET_TIME" ] || [ -z "$BASE_BACKUP_DIR" ]; then
  echo "Usage: $0 <target-time> <base-backup-dir> [--force] [--dry-run]"
  echo ""
  echo "  target-time:    ISO 8601 timestamp (e.g., '2026-04-13 14:30:00 UTC')"
  echo "  base-backup-dir: Path to pg_basebackup output directory"
  echo "  --force:        Skip confirmation prompt (for automation)"
  echo "  --dry-run:      Show what would be done without executing"
  echo ""
  echo "  Example:"
  echo "    $0 '2026-04-13 14:30:00 UTC' /var/backups/dos-platform/base_20260413_020000"
  echo ""
  echo "  Prerequisites:"
  echo "    - WAL archiving must be enabled (see ops/postgresql/wal-archiving.conf)"
  echo "    - A base backup must exist (created with: bash ops/scripts/backup-db.sh --base-backup)"
  echo "    - WAL files must exist in: $WAL_ARCHIVE_DIR"
  exit 1
fi

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Point-in-Time Recovery           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Target time:   $TARGET_TIME"
echo "  Base backup:   $BASE_BACKUP_DIR"
echo "  WAL archive:   $WAL_ARCHIVE_DIR"
echo "  PG data dir:   $PG_DATA"
echo ""

# Safety prompt
if [ "$FORCE" != "true" ]; then
  read -p "  ⚠  This will REPLACE the PostgreSQL data directory. Continue? (y/N) " confirm
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
  echo "  2. Stop PostgreSQL: sudo systemctl stop postgresql"
  echo "  3. Create safety backup: $SAFETY_BACKUP"
  echo "  4. Restore base backup from: $BASE_BACKUP_DIR"
  echo "  5. Configure recovery target: $TARGET_TIME"
  echo "  6. Start PostgreSQL and replay WAL"
  echo "  7. Run migrations: bash ops/scripts/run-migrations.sh"
  echo "  8. Start all services: pm2 start ops/ecosystem.all.config.js"
  echo "  9. Health check: bash ops/scripts/health-check-all.sh"
  exit 0
fi

# Verify base backup exists
if [ ! -d "$BASE_BACKUP_DIR" ] && [ ! -f "$BASE_BACKUP_DIR/base.tar.gz" ]; then
  echo "ERROR: Base backup not found at $BASE_BACKUP_DIR"
  exit 1
fi

# Verify WAL archive exists
if [ ! -d "$WAL_ARCHIVE_DIR" ]; then
  echo "ERROR: WAL archive directory not found at $WAL_ARCHIVE_DIR"
  exit 1
fi

WAL_COUNT=$(ls "$WAL_ARCHIVE_DIR"/ 2>/dev/null | wc -l)
echo "  WAL files available: $WAL_COUNT"
echo ""

# Step 1: Stop all application services
echo "→ Step 1: Stopping all services"
pm2 stop all 2>/dev/null || true

# Step 2: Stop PostgreSQL
echo "→ Step 2: Stopping PostgreSQL"
sudo systemctl stop postgresql 2>/dev/null || sudo pg_ctlcluster 16 main stop 2>/dev/null || true

# Step 3: Backup current data directory (safety net)
SAFETY_BACKUP="/var/backups/dos-platform/pg_data_before_pitr_$(date +%Y%m%d_%H%M%S)"
echo "→ Step 3: Creating safety backup of current data at $SAFETY_BACKUP"
sudo cp -a "$PG_DATA" "$SAFETY_BACKUP"

# Step 4: Clear and restore base backup
echo "→ Step 4: Restoring base backup"
sudo rm -rf "$PG_DATA"/*

if [ -f "$BASE_BACKUP_DIR/base.tar.gz" ]; then
  sudo tar xzf "$BASE_BACKUP_DIR/base.tar.gz" -C "$PG_DATA"
else
  sudo cp -a "$BASE_BACKUP_DIR"/* "$PG_DATA"/
fi

# Step 5: Configure recovery
echo "→ Step 5: Configuring point-in-time recovery target"
sudo touch "$PG_DATA/recovery.signal"

# Write recovery parameters
sudo tee "$PG_DATA/postgresql.auto.conf" > /dev/null <<PGCONF
restore_command = 'cp $WAL_ARCHIVE_DIR/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
PGCONF

# Ensure correct ownership
sudo chown -R postgres:postgres "$PG_DATA"

# Step 6: Start PostgreSQL (begins WAL replay)
echo "→ Step 6: Starting PostgreSQL (WAL replay in progress)"
sudo systemctl start postgresql 2>/dev/null || sudo pg_ctlcluster 16 main start 2>/dev/null

# Step 7: Wait for recovery to complete
echo "→ Step 7: Waiting for recovery to complete..."
for i in $(seq 1 120); do
  IS_RECOVERY=$(sudo -u postgres psql -t -A -c "SELECT pg_is_in_recovery();" 2>/dev/null || echo "t")
  if [ "$IS_RECOVERY" = "f" ]; then
    echo "  ✓ Recovery complete"
    break
  fi
  if [ $i -eq 120 ]; then
    echo "  ⚠  Recovery still in progress after 120s — check PostgreSQL logs"
  fi
  sleep 1
done

# Step 8: Run migrations (in case recovery target predates some migrations)
echo "→ Step 8: Running migrations"
bash ops/scripts/run-migrations.sh || true

# Step 9: Start services
echo "→ Step 9: Starting all services"
pm2 start ops/ecosystem.all.config.js

# Step 10: Health check
echo "→ Step 10: Verifying service health"
sleep 5
bash ops/scripts/health-check-all.sh || true

echo ""
echo "── PITR Complete ─────────────────────────────────"
echo "  Restored to: $TARGET_TIME"
echo "  Safety backup: $SAFETY_BACKUP"
echo ""
echo "  If recovery looks wrong, restore the safety backup:"
echo "    sudo systemctl stop postgresql"
echo "    sudo rm -rf $PG_DATA/*"
echo "    sudo cp -a $SAFETY_BACKUP/* $PG_DATA/"
echo "    sudo systemctl start postgresql"
