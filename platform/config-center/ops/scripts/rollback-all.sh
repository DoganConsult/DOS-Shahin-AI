#!/usr/bin/env bash
set -euo pipefail

COMMIT="${1:-}"
DRY_RUN=false

show_help() {
  cat <<EOF
Usage: $(basename "$0") <commit-hash> [OPTIONS]

Rolls back ALL services to the given commit.

Arguments:
  commit-hash          Target commit to rollback to

Options:
  --dry-run            Show what would be done without executing
  --help, -h           Show this help message

Environment Variables:
  DEPLOY_PATH          Deployment path (default: current directory)

Examples:
  # Rollback all services to a commit
  $(basename "$0") abc123f

  # Dry run to preview
  $(basename "$0") abc123f --dry-run
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h) show_help ;;
  esac
done

if [ -z "$COMMIT" ]; then
  echo "Usage: $0 <commit-hash> [--dry-run]"
  echo "  Rolls back ALL services to the given commit"
  exit 1
fi

DEPLOY_PATH="${DEPLOY_PATH:-$(pwd)}"
cd "$DEPLOY_PATH"

echo "╔══════════════════════════════════════════════════╗"
echo "║  DOS Platform — Full Rollback                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Target commit: $COMMIT"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "[DRY RUN] Would execute:"
  echo "  1. Stop all services: pm2 stop all"
  echo "  2. Checkout target commit: git checkout $COMMIT -- services/ packages/ platform/"
  echo "  3. Install dependencies: pnpm install"
  echo "  4. Rebuild packages: pnpm run build:packages"
  echo "  5. Rebuild services: pnpm run build:services"
  echo "  6. Restart all services: pm2 start ops/ecosystem.all.config.js"
  echo "  7. Wait for health checks: bash ops/scripts/health-check-all.sh"
  exit 0
fi

echo "→ Step 1: Stop all services"
pm2 stop all 2>/dev/null || true

echo "→ Step 2: Checkout target commit"
git checkout "$COMMIT" -- services/ packages/ platform/

echo "→ Step 3: Install dependencies"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "→ Step 4: Rebuild packages"
pnpm run build:packages

echo "→ Step 5: Rebuild services"
pnpm run build:services 2>/dev/null || true

echo "→ Step 6: Restart all services"
pm2 start ops/ecosystem.all.config.js

echo "→ Step 7: Wait for health checks"
sleep 10
bash ops/scripts/health-check-all.sh || true

echo ""
echo "── Rollback Complete ──────────────────────────────"
echo "  To undo: git checkout $(git rev-parse HEAD) -- services/ packages/ platform/"
