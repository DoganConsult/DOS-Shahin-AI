#!/usr/bin/env bash
# Stage 2 — DRY-RUN by default. This rewrites platform/services/products imports
# that currently reach into modules/ so that modules/ becomes truly downstream-only.
#
# It does NOT modify modules/. Run in DRY-RUN to preview, then `APPLY=1` to execute.
#
# Renames:
#   @dos/module-sdk        -> @dos/platform-module-sdk      (promote out of modules/)
#   @dos/module-telemetry  -> @dos/platform-telemetry
#
# Untouched:
#   @dos/module-auth, @dos/module-foundation  (already in platform/, fine)
#   @dos/module-risk, @dos/module-compliance, @dos/module-qiyas, @dos/module-soc, @dos/module-dos
#     -> these ARE business modules; if platform consumes them that is a four-tier
#        violation that must be fixed by the consuming team, not by a renaming script.
#
# After this script, you must:
#   1. mv modules/packages/dos-module-sdk    -> packages/platform-module-sdk
#   2. mv modules/packages/module-telemetry  -> packages/platform-telemetry
#   3. update package.json "name" fields
#   4. update root pnpm-workspace.yaml entries
#   5. pnpm install && pnpm -w build
set -euo pipefail
ROOT="${ROOT:-/root/DOS-Platform}"
APPLY="${APPLY:-0}"

declare -A RENAMES=(
  ["@dos/module-sdk"]="@dos/platform-module-sdk"
  ["@dos/module-telemetry"]="@dos/platform-telemetry"
)

for from in "${!RENAMES[@]}"; do
  to="${RENAMES[$from]}"
  echo "=== $from  ->  $to ==="
  files=$(grep -rEln "[\"']${from}[\"'/]" "$ROOT/platform" "$ROOT/services" "$ROOT/products" \
    --include="*.ts" --include="*.tsx" --include="*.json" 2>/dev/null || true)
  count=$(echo -n "$files" | grep -c . || true)
  echo "files affected: $count"
  if [ "$APPLY" = "1" ] && [ -n "$files" ]; then
    echo "$files" | xargs sed -i "s|${from}|${to}|g"
    echo "applied."
  fi
done

echo
echo "Done (APPLY=$APPLY). Re-run with APPLY=1 to write changes."
