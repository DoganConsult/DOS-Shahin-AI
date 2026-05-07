#!/usr/bin/env bash
set -uo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Builds all TypeScript modules in the modules/ directory.

Options:
  --help, -h           Show this help message

Environment Variables:
  None

Examples:
  # Build all modules
  $(basename "$0)

Note:
  Skips modules without tsconfig.json or backend source.
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

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
