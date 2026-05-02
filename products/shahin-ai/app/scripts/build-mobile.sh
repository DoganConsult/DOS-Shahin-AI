#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Shahin GRC — Mobile Build Script
# Builds Angular production bundle and syncs to native iOS/Android projects.
#
# Usage:
#   ./scripts/build-mobile.sh              # Build both platforms
#   ./scripts/build-mobile.sh android      # Android only
#   ./scripts/build-mobile.sh ios          # iOS only
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

PLATFORM="${1:-all}"
BUILD_CONFIG="${BUILD_CONFIG:-production}"
VERSION=$(node -p "require('./package.json').version")

echo "╔══════════════════════════════════════════════╗"
echo "║  Shahin GRC — Mobile Build v${VERSION}           ║"
echo "║  Platform: ${PLATFORM}                             ║"
echo "║  Config:   ${BUILD_CONFIG}                      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ──────────────────── Step 1: Install dependencies ────────────────────
echo "→ Installing dependencies..."
pnpm install --frozen-lockfile

# ──────────────────── Step 2: Build Angular ────────────────────
echo "→ Building Angular (${BUILD_CONFIG})..."
pnpm exec ng build --configuration "${BUILD_CONFIG}"

# Verify build output exists
if [ ! -d "dist/shahin-grc/browser" ]; then
  echo "✗ Build output not found at dist/shahin-grc/browser"
  exit 1
fi

echo "✓ Angular build complete ($(du -sh dist/shahin-grc/browser | cut -f1))"

# ──────────────────── Step 3: Sync to native projects ────────────────────
case "$PLATFORM" in
  android)
    echo "→ Syncing to Android..."
    pnpm exec cap sync android
    echo "✓ Android sync complete"
    ;;
  ios)
    echo "→ Syncing to iOS..."
    pnpm exec cap sync ios
    echo "✓ iOS sync complete"
    ;;
  all)
    echo "→ Syncing to both platforms..."
    pnpm exec cap sync
    echo "✓ Both platforms synced"
    ;;
  *)
    echo "✗ Unknown platform: ${PLATFORM}"
    echo "  Usage: $0 [android|ios|all]"
    exit 1
    ;;
esac

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✓ Mobile build complete!                   ║"
echo "║                                              ║"
echo "║  Next steps:                                 ║"
echo "║  • Android: pnpm run cap:open:android        ║"
echo "║  • iOS:     pnpm run cap:open:ios            ║"
echo "╚══════════════════════════════════════════════╝"
