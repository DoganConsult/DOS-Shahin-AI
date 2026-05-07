#!/usr/bin/env bash
# Platform-wide bootstrap. Runs in order:
#   1. Validate required env vars.
#   2. Install dependencies.
#   3. Build every @dos/ports consumer in dependency order.
#   4. Run every platform schema migration (DOS, DAuth, DSOC, DNOC).
#   5. Reconcile the platform catalog (products/*/manifest -> 4 catalog tables).
#   6. Start the services via PM2 (ops/ecosystem.all.config.js).
#
# Idempotent — safe to re-run.
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Platform-wide bootstrap that initializes the entire DOS Platform stack.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (required)
  REDIS_URL            Redis connection string (required)

Steps:
  1. Validate required environment variables
  2. Install workspace dependencies
  3. Build @dos/ports and core packages in dependency order
  4. Run platform schema migrations
  5. Reconcile platform catalog
  6. Start services via PM2

Examples:
  # Initialize platform
  $(basename "$0)

  # With explicit env vars
  DATABASE_URL=postgresql://... REDIS_URL=redis://... $(basename "$0)

Note:
  Idempotent — safe to re-run.
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "[platform:init] repo = $REPO_ROOT"

# ── 1. Env validation ─────────────────────────────────────────
REQUIRED_VARS=(DATABASE_URL REDIS_URL)
missing=()
for v in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    missing+=("$v")
  fi
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "[platform:init] ✗ missing required env vars: ${missing[*]}" >&2
  exit 1
fi
echo "[platform:init] ✓ env vars present (${REQUIRED_VARS[*]})"

# ── 2. Install ────────────────────────────────────────────────
echo "[platform:init] installing workspace deps"
pnpm install --frozen-lockfile

# ── 3. Build in dependency order ──────────────────────────────
# @dos/ports is the type contract every other platform module
# depends on, so it must be built first. Then the four *-core
# packages. Then the runtime services.
echo "[platform:init] building @dos/ports"
pnpm --filter '@dos/ports' run build

for pkg in @dos/dos-core @dos/dauth-core @dos/dsoc-core @dos/dnoc-core; do
  if pnpm list --depth -1 "$pkg" >/dev/null 2>&1 || [[ -d "$REPO_ROOT/platform/$(echo $pkg | sed 's/@dos\///; s/-core//')/packages/core" ]]; then
    echo "[platform:init] building $pkg"
    pnpm --filter "$pkg" run build || true
  fi
done

# ── 4. Migrations ─────────────────────────────────────────────
echo "[platform:init] applying platform schemas"
pnpm exec tsx migration/migration-runner.ts up

# ── 5. Catalog reconcile ──────────────────────────────────────
# Reconciles every catalog table from products/*/manifest/product.manifest.json:
#   - platform_dos.modules_registry, products_registry, product_modules
#   - public.product_modules (gateway runtime catalog filter)
# Additive by default (no prune). To soft-retire orphans pass CATALOG_PRUNE=1.
echo "[platform:init] reconciling platform catalog from products/*/manifest/"
if [[ "${CATALOG_PRUNE:-0}" == "1" ]]; then
  pnpm exec tsx ops/scripts/catalog-sync.ts --prune
else
  pnpm exec tsx ops/scripts/catalog-sync.ts
fi

# ── 6. Start services ─────────────────────────────────────────
echo "[platform:init] starting services via PM2"
pm2 start ops/ecosystem.all.config.js

echo "[platform:init] ✓ done"
