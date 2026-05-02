#!/usr/bin/env bash
set -uo pipefail

MODULES_DIR="$(cd "$(dirname "$0")/../../modules" && pwd)"
FAILED=()
SUCCEEDED=0
SKIPPED=0

for dir in "$MODULES_DIR"/*/; do
  name=$(basename "$dir")
  [ "$name" = "governance" ] && continue
  [ ! -f "$dir/tsconfig.json" ] && { SKIPPED=$((SKIPPED + 1)); continue; }
  # Allow either source/backend OR src/ as backend tree
  [ ! -d "$dir/source/backend" ] && [ ! -d "$dir/src" ] && { SKIPPED=$((SKIPPED + 1)); continue; }

  echo "── Building module: $name"
  if npx tsc -p "$dir/tsconfig.json"; then
    SUCCEEDED=$((SUCCEEDED + 1))
  else
    echo "   ✗ $name: TypeScript compile failed"
    FAILED+=("$name")
  fi
done

echo ""
echo "═══════════════════════════════════════"
echo "Module build complete: $SUCCEEDED built, $SKIPPED skipped, ${#FAILED[@]} failed"
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "Failed modules: ${FAILED[*]}"
  exit 1
fi
