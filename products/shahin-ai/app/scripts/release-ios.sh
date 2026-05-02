#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Shahin GRC — iOS Release Build
# Produces a signed IPA for App Store Connect upload via Xcode / xcodebuild.
#
# Prerequisites:
#   - macOS with Xcode 15+ installed
#   - Valid Apple Developer certificate + provisioning profile
#   - APPLE_TEAM_ID environment variable set
#
# Usage:
#   ./scripts/release-ios.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

VERSION=$(node -p "require('./package.json').version")
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M)}"
SCHEME="App"
WORKSPACE="ios/App/App.xcworkspace"
ARCHIVE_PATH="build/ShahinGRC.xcarchive"
EXPORT_PATH="build/ShahinGRC-ipa"

echo "╔══════════════════════════════════════════════╗"
echo "║  Shahin GRC — iOS Release                   ║"
echo "║  Version:   ${VERSION}                        ║"
echo "║  Build:     ${BUILD_NUMBER}                      ║"
echo "╚══════════════════════════════════════════════╝"

# ──────────────────── Validate macOS ────────────────────
if [[ "$(uname)" != "Darwin" ]]; then
  echo "✗ iOS builds require macOS"
  exit 1
fi

# ──────────────────── Build Angular + sync ────────────────────
"$SCRIPT_DIR/build-mobile.sh" ios

# ──────────────────── Update version in Xcode project ────────────────────
echo "→ Updating version in Xcode project..."
cd ios/App
if command -v agvtool &>/dev/null; then
  agvtool new-marketing-version "$VERSION"
  agvtool new-version -all "$BUILD_NUMBER"
fi
cd "$PROJECT_DIR"

# ──────────────────── Install CocoaPods ────────────────────
if [ -f "ios/App/Podfile" ]; then
  echo "→ Installing CocoaPods..."
  cd ios/App
  pod install --repo-update
  cd "$PROJECT_DIR"
fi

# ──────────────────── Archive ────────────────────
echo "→ Archiving..."
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination "generic/platform=iOS" \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="${APPLE_TEAM_ID:-}" \
  | tail -20

# ──────────────────── Export IPA ────────────────────
echo "→ Exporting IPA..."

# Create export options plist
cat > build/ExportOptions.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>uploadSymbols</key>
  <true/>
  <key>compileBitcode</key>
  <false/>
  <key>stripSwiftSymbols</key>
  <true/>
</dict>
</plist>
PLIST

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist build/ExportOptions.plist \
  | tail -10

# ──────────────────── Result ────────────────────
IPA_PATH=$(find "$EXPORT_PATH" -name "*.ipa" -type f | head -1)
if [ -n "$IPA_PATH" ]; then
  SIZE=$(du -h "$IPA_PATH" | cut -f1)
  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║  ✓ iOS release built!                       ║"
  echo "║  IPA: ${IPA_PATH}                            "
  echo "║  Size: ${SIZE}                               "
  echo "║                                              ║"
  echo "║  Upload to App Store Connect:                ║"
  echo "║  appstoreconnect.apple.com                   ║"
  echo "║                                              ║"
  echo "║  Or use: xcrun altool --upload-app           ║"
  echo "╚══════════════════════════════════════════════╝"
else
  echo "✗ IPA not found in ${EXPORT_PATH}"
  exit 1
fi
