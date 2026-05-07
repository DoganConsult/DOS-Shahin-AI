#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# snapshot-before-drop.sh
# W1.6 — Pre-flight pg_dump of every tenant schema before destructive
# migrations run. Invoked by run-tenant-migrations.sh when about to
# apply any migration matching the DESTRUCTIVE_MIGRATION_PATTERN.
#
# Produces a timestamped snapshot at:
#   ops/backups/<UTC-iso>/<schema_name>.sql
# and a receipt file used by run-tenant-migrations.sh as proof:
#   ops/backups/<UTC-iso>/RECEIPT
#
# Exits non-zero if any schema dump fails — halting the migration run.
#
# Optional env:
#   DOS_BACKUP_ROOT    override ops/backups
#   DOS_BACKUP_S3_URI  if set, additionally uploads to S3 (requires aws cli)
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_ROOT="${DOS_BACKUP_ROOT:-$REPO_ROOT/ops/backups}"
DRY_RUN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Creates pg_dump snapshots of all active tenant schemas before destructive migrations.

Options:
  --dry-run            Show what would be done without executing
  --help, -h           Show this help message

Environment Variables:
  DOS_BACKUP_ROOT      Backup root directory (default: ops/backups)
  DOS_BACKUP_S3_URI    S3 URI for remote backup upload (requires aws CLI)
  DATABASE_URL         PostgreSQL connection string

Examples:
  # Snapshot all tenant schemas
  $(basename "$0")

  # Dry run to preview
  $(basename "$0") --dry-run
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h) show_help ;;
  esac
done

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/load-env.sh"
if [ -z "${DATABASE_URL:-}" ]; then
  dos_load_shared_env || true
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  exit 1
fi

PSQL="psql ${DATABASE_URL} -v ON_ERROR_STOP=1"
TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
TARGET_DIR="$BACKUP_ROOT/$TIMESTAMP"
mkdir -p "$TARGET_DIR"

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] Would execute:"
  echo "  1. Query active tenants from dos.tenants"
  echo "  2. pg_dump each tenant schema to: $TARGET_DIR/<schema_name>.sql"
  echo "  3. Upload to S3 if DOS_BACKUP_S3_URI is set"
  echo "  4. Write receipt to: $TARGET_DIR/RECEIPT"
  echo "  5. Create symlink: $BACKUP_ROOT/LATEST -> $TIMESTAMP"
  exit 0
fi

echo "── Pre-drop snapshot → $TARGET_DIR ──"

TENANT_ROWS=$(
  $PSQL -t -A -F '|' -c \
    "SELECT tenant_id, schema_name FROM dos.tenants WHERE status <> 'deleted' ORDER BY tenant_id"
)

if [ -z "$TENANT_ROWS" ]; then
  echo "No active tenants — nothing to snapshot."
  printf 'NO_ACTIVE_TENANTS\n' > "$TARGET_DIR/RECEIPT"
  exit 0
fi

FAILED=0
while IFS='|' read -r tenant_id schema_name; do
  [ -n "$schema_name" ] || continue
  if ! [[ "$schema_name" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "   ✗ REFUSED: schema_name '$schema_name' contains unsafe characters"
    FAILED=$((FAILED + 1))
    continue
  fi
  local_out="$TARGET_DIR/$schema_name.sql"
  if pg_dump "$DATABASE_URL" --schema="$schema_name" --no-owner --no-privileges \
      > "$local_out" 2> "$TARGET_DIR/$schema_name.err"; then
    # Strip empty error log to keep the backup dir clean.
    [ -s "$TARGET_DIR/$schema_name.err" ] || rm -f "$TARGET_DIR/$schema_name.err"
    echo "   ✓ $schema_name ($(wc -c < "$local_out") bytes)"
  else
    echo "   ✗ $schema_name (see $TARGET_DIR/$schema_name.err)"
    FAILED=$((FAILED + 1))
  fi
done <<< "$TENANT_ROWS"

if [ $FAILED -gt 0 ]; then
  echo "ABORT: $FAILED snapshot failure(s). Migration must not proceed."
  printf 'FAILED=%s\n' "$FAILED" > "$TARGET_DIR/RECEIPT"
  exit 1
fi

# Optional: upload to S3.
if [ -n "${DOS_BACKUP_S3_URI:-}" ]; then
  if command -v aws > /dev/null; then
    aws s3 cp --recursive "$TARGET_DIR" "$DOS_BACKUP_S3_URI/$TIMESTAMP/"
    echo "   ✓ Uploaded to $DOS_BACKUP_S3_URI/$TIMESTAMP/"
  else
    echo "   ⚠  DOS_BACKUP_S3_URI set but aws CLI is missing; skipping remote upload"
  fi
fi

# Emit receipt — run-tenant-migrations.sh checks for this before running a
# destructive-pattern migration.
{
  printf 'TIMESTAMP=%s\n' "$TIMESTAMP"
  printf 'TENANTS=%s\n' "$(echo "$TENANT_ROWS" | wc -l)"
  printf 'STATUS=OK\n'
} > "$TARGET_DIR/RECEIPT"

# Expose to downstream via well-known symlink.
ln -snf "$TIMESTAMP" "$BACKUP_ROOT/LATEST"
echo "Snapshot complete. Receipt: $TARGET_DIR/RECEIPT"
