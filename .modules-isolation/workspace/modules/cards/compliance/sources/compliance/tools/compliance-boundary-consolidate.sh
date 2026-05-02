#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DEPRECATED — historical one-shot boundary-consolidation tool.
#
# This script was used ONCE during the Compliance Module boundary extraction
# pass. It uses `mv` (not `cp`) and routes everything into ./_moved/, so it is
# inherently single-use and not a reusable build step.
#
# Phase 4A (2026-04-29) note:
#   The legacy paths referenced in `copy_parents` calls below
#   (`DOS Platform/Shahin-AI Website/frontend/...`, `DOS Platform/Dynamic UI/db/...`,
#   `packages/shahin-product/...`) all predate the canonical-source restructure.
#   - "Shahin-AI Website/frontend/" → "products/shahin-ai/app/"
#   - "Dynamic UI/" → "platform/dynamic-ui/"
#   - "Shahin-AI Website/" parent was removed entirely.
#   Re-running this script today is harmless (it will print "MISSING:" for every
#   stale path) but will not consolidate anything new.
#
# Disposition: kept as-is for audit trail of what was originally consolidated.
# Phase 5 (Compliance Module promotion to modules/compliance/) will decide
# whether to delete this file outright or rewrite it against canonical paths.
# Do NOT use as a template for new work.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="/root/DOS-AIO"
MODULE_ROOT="$ROOT/DOS Platform/modules/compliance"
OUT="$MODULE_ROOT/_moved"

mkdir -p "$OUT"

copy_parents() {
  local rel="$1"
  local src="$ROOT/$rel"
  if [[ ! -e "$src" ]]; then
    echo "MISSING: $src" >&2
    return 0
  fi
  mkdir -p "$OUT"
  mkdir -p "$OUT/$(dirname "$rel")"
  mv "$src" "$OUT/$rel"
}

copy_parents "DOS Platform/Shahin-AI Website/frontend/src/app/platform-manifests/compliance.module.routes.ts"
copy_parents "DOS Platform/Shahin-AI Website/frontend/src/app/blueprint/features/compliance"
copy_parents "DOS Platform/Shahin-AI Website/frontend/src/app/blueprint/features/controls/services/controls-api.service.ts"
copy_parents "packages/shahin-product/src/route-catalogs/compliance-routes.catalog.ts"
copy_parents "packages/shahin-product/src/agrc-route-manifest.ts"
copy_parents "DOS Platform/registries/route-catalogs/core/core-compliance-regulatory-routes.catalog.ts"
copy_parents "DOS Platform/Dynamic UI/db/public/seeds/010_seed_compliance_module.sql"
copy_parents "tests/integration/m4-compliance-perms-tenant.test.ts"
copy_parents "tests/e2e/new-user-journey.e2e.test.ts"
copy_parents "tests/e2e/comprehensive-critical-paths.test.ts"

find "$OUT" -type f | sort > "$OUT/files.txt"
echo "DONE: $OUT"
echo "FILES: $(wc -l < "$OUT/files.txt")"
