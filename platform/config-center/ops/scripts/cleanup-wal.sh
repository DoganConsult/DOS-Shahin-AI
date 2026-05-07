#!/usr/bin/env bash
set -euo pipefail

# ╔════════════════════════════════════════════════╗
# ║  DOS Platform — WAL Archive Cleanup              ║
# ║  Removes WAL files older than retention period.  ║
# ╚══════════════════════════════════════════════════╝

WAL_DIR="${WAL_ARCHIVE_DIR:-/var/backups/dos-platform/wal}"
RETENTION_DAYS="${WAL_RETENTION_DAYS:-7}"
DRY_RUN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Removes WAL files older than retention period.

Options:
  --dry-run            Show what would be done without executing
  --help, -h           Show this help message

Environment Variables:
  WAL_ARCHIVE_DIR      WAL archive directory (default: /var/backups/dos-platform/wal)
  WAL_RETENTION_DAYS   Retention period in days (default: 7)

Examples:
  # Clean WAL files older than 7 days
  $(basename "$0")

  # Clean WAL files older than 30 days
  WAL_RETENTION_DAYS=30 $(basename "$0")

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

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — WAL Archive Cleanup              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  WAL directory:   $WAL_DIR"
echo "  Retention:       $RETENTION_DAYS days"
echo ""

if [ ! -d "$WAL_DIR" ]; then
  echo "  WAL directory does not exist. Nothing to clean."
  exit 0
fi

TOTAL=$(find "$WAL_DIR" -type f | wc -l)

if [ "$DRY_RUN" = true ]; then
  DELETED=$(find "$WAL_DIR" -type f -mtime +${RETENTION_DAYS} -print | wc -l)
  REMAINING=$((TOTAL - DELETED))
  echo "[DRY RUN] Would delete $DELETED WAL files older than ${RETENTION_DAYS} days"
  echo "  Total WAL files:   $TOTAL"
  echo "  Would delete:      $DELETED"
  echo "  Would remain:      $REMAINING"
  exit 0
fi

DELETED=$(find "$WAL_DIR" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
REMAINING=$((TOTAL - DELETED))

echo "  Total WAL files:   $TOTAL"
echo "  Deleted (>${RETENTION_DAYS}d): $DELETED"
echo "  Remaining:         $REMAINING"
echo ""
echo "  ✓ Cleanup complete"
