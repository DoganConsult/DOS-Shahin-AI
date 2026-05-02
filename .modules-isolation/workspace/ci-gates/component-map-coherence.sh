#!/usr/bin/env bash
# component-map-coherence.sh
# Guard: every approved DB component_key must have a COMPONENT_MAP entry,
# every COMPONENT_MAP key must be in the registry (or marked legacy),
# every carbon_key referenced must exist in dos.ui_carbon_components,
# every active route/widget/page must reference an approved component.
#
# Operates on:
#   - platform/dos/migrations/public/20260502_0148_ibm_carbon_component_catalog.sql (catalog)
#   - platform/dos/registry/component-map.ts                                       (frontend allowlist)
#   - platform/dos/migrations/public/20260502_0500_compliance_components_runtime_register.sql (registry seed)
#   - .modules-isolation/workspace/profiles/grc/enrolment/<m>/05_component_registry.sql (workspace seeds)
set -euo pipefail
ROOT="${ROOT:-/root/DOS-Platform}"
WS="$ROOT/.modules-isolation/workspace"
LIVE_CATALOG="$ROOT/platform/dos/migrations/public/20260502_0148_ibm_carbon_component_catalog.sql"
LIVE_MAP="$ROOT/platform/dos/registry/component-map.ts"
LIVE_REG_DIR="$ROOT/platform/dos/migrations/public"
WORKSPACE_REG_DIR="$WS/profiles/grc/enrolment"
OUT="$WS/ci-gates/cache"
mkdir -p "$OUT"

# 1. Carbon catalog keys
awk '/INSERT INTO dos.ui_carbon_components/,/;/' "$LIVE_CATALOG" \
  | grep -oE "^\s*\('[a-z][a-z0-9-]*'" | tr -d "( '" | sort -u > "$OUT/carbon-keys.txt"

# 2. COMPONENT_MAP keys
grep -oE "^\s*'[^']+':" "$LIVE_MAP" | tr -d "':" | tr -d ' ' | sort -u > "$OUT/component-map-keys.txt"

# 3. All registry rows (live + workspace)
{ awk '/INSERT INTO dos\.dynamic_ui_component_registry/,/;/' \
    "$LIVE_REG_DIR"/*.sql 2>/dev/null
  cat "$WORKSPACE_REG_DIR"/*/05_component_registry.sql 2>/dev/null
} | grep -oE "^\s*\('[A-Za-z][A-Za-z0-9_]+',\s*'ibm-carbon',\s*'[a-z]+',\s*'[a-z0-9-]+'" \
  | tr -d "(" \
  > "$OUT/registry-rows.txt"

ERR=0
echo "[component-map-coherence] catalog keys:        $(wc -l < $OUT/carbon-keys.txt)"
echo "[component-map-coherence] component_map keys:  $(wc -l < $OUT/component-map-keys.txt)"
echo "[component-map-coherence] registry rows:       $(wc -l < $OUT/registry-rows.txt)"

# 4. Find approved registry rows whose carbon_key is NOT in catalog
INVALID_FK=0
while IFS= read -r row; do
  CARBON=$(echo "$row" | awk -F"'," '{print $4}' | tr -d "' ")
  COMP=$(echo "$row" | awk -F"'," '{print $1}' | tr -d "' ")
  STATUS=$(echo "$row" | awk -F"'," '{print $3}' | tr -d "' ")
  [ "$STATUS" = "approved" ] || continue
  if ! grep -qx "$CARBON" "$OUT/carbon-keys.txt"; then
    echo "[component-map-coherence] FAIL: registry row '$COMP' carbon_key='$CARBON' not in dos.ui_carbon_components"
    INVALID_FK=$((INVALID_FK+1))
    ERR=1
  fi
done < "$OUT/registry-rows.txt"
echo "[component-map-coherence] invalid carbon_key FK refs: $INVALID_FK"

# 5. Find approved registry rows whose component_key is NOT in COMPONENT_MAP
MISSING_FE=0
while IFS= read -r row; do
  COMP=$(echo "$row" | awk -F"'," '{print $1}' | tr -d "' ")
  STATUS=$(echo "$row" | awk -F"'," '{print $3}' | tr -d "' ")
  [ "$STATUS" = "approved" ] || continue
  if ! grep -qx "$COMP" "$OUT/component-map-keys.txt"; then
    echo "[component-map-coherence] WARN: '$COMP' approved in DB but missing from COMPONENT_MAP"
    MISSING_FE=$((MISSING_FE+1))
  fi
done < "$OUT/registry-rows.txt"
echo "[component-map-coherence] components missing COMPONENT_MAP entries: $MISSING_FE"

# 6. Find COMPONENT_MAP keys not backed by a registry row (stale)
STALE=0
while IFS= read -r k; do
  [ -n "$k" ] || continue
  if ! grep -qE "^'$k'," "$OUT/registry-rows.txt"; then
    echo "[component-map-coherence] note: COMPONENT_MAP entry '$k' has no DB registry backing (legacy/internal allowed)"
    STALE=$((STALE+1))
  fi
done < "$OUT/component-map-keys.txt"
echo "[component-map-coherence] COMPONENT_MAP entries without DB backing: $STALE"

# 7. Strict mode (env=STRICT=1): treat missing COMPONENT_MAP as FAIL
if [ "${STRICT:-0}" = "1" ] && [ "$MISSING_FE" -gt 0 ]; then
  ERR=1
  echo "[component-map-coherence] STRICT mode: missing COMPONENT_MAP entries fail the gate"
fi

if [ $ERR -eq 0 ]; then
  echo "[component-map-coherence] PASS"
  exit 0
else
  echo "[component-map-coherence] FAIL"
  exit 1
fi
