#!/usr/bin/env bash
set -euo pipefail

# ╔══════════════════════════════════════════════════╗
# ║  DOS Platform — WAL Archive Cleanup              ║
# ║  Removes WAL files older than retention period.  ║
# ╚══════════════════════════════════════════════════╝

WAL_DIR="${WAL_ARCHIVE_DIR:-/var/backups/dos-platform/wal}"
RETENTION_DAYS="${WAL_RETENTION_DAYS:-7}"

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
DELETED=$(find "$WAL_DIR" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
REMAINING=$((TOTAL - DELETED))

echo "  Total WAL files:   $TOTAL"
echo "  Deleted (>${RETENTION_DAYS}d): $DELETED"
echo "  Remaining:         $REMAINING"
echo ""
echo "  ✓ Cleanup complete"
