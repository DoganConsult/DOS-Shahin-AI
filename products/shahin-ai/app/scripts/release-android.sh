#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Shahin GRC — Android Release Build
# Produces a signed AAB (Android App Bundle) for Google Play upload.
#
# Prerequisites:
#   ANDROID_KEYSTORE_PATH   — path to .jks keystore file
#   ANDROID_KEYSTORE_PASS   — keystore password
#   ANDROID_KEY_ALIAS       — key alias
#   ANDROID_KEY_PASS        — key password
#
# Usage:
#   ./scripts/release-android.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

VERSION=$(node -p "require('./package.json').version")
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M)}"

echo "╔══════════════════════════════════════════════╗"
echo "║  Shahin GRC — Android Release               ║"
echo "║  Version:   ${VERSION}                        ║"
echo "║  Build:     ${BUILD_NUMBER}                      ║"
echo "╚══════════════════════════════════════════════╝"

# ──────────────────── Validate environment ────────────────────
for var in ANDROID_KEYSTORE_PATH ANDROID_KEYSTORE_PASS ANDROID_KEY_ALIAS ANDROID_KEY_PASS; do
  if [ -z "${!var:-}" ]; then
    echo "✗ Missing environment variable: ${var}"
    exit 1
  fi
done

# ──────────────────── Build Angular + sync ────────────────────
"$SCRIPT_DIR/build-mobile.sh" android

# ──────────────────── Update version in build.gradle ────────────────────
GRADLE_FILE="android/app/build.gradle"
if [ -f "$GRADLE_FILE" ]; then
  echo "→ Updating version in build.gradle..."
  sed -i "s/versionName \".*\"/versionName \"${VERSION}\"/" "$GRADLE_FILE"
  sed -i "s/versionCode [0-9]*/versionCode ${BUILD_NUMBER}/" "$GRADLE_FILE"
fi

# ──────────────────── Build signed AAB ────────────────────
echo "→ Building signed AAB..."
cd android

./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file="$ANDROID_KEYSTORE_PATH" \
  -Pandroid.injected.signing.store.password="$ANDROID_KEYSTORE_PASS" \
  -Pandroid.injected.signing.key.alias="$ANDROID_KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$ANDROID_KEY_PASS"

cd "$PROJECT_DIR"

# ──────────────────── Locate output ────────────────────
AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
  SIZE=$(du -h "$AAB_PATH" | cut -f1)
  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║  ✓ Android release built!                   ║"
  echo "║  AAB: ${AAB_PATH}                            "
  echo "║  Size: ${SIZE}                               "
  echo "║                                              ║"
  echo "║  Upload to Google Play Console:              ║"
  echo "║  play.google.com/console                     ║"
  echo "╚══════════════════════════════════════════════╝"
else
  echo "✗ AAB not found at ${AAB_PATH}"
  exit 1
fi
