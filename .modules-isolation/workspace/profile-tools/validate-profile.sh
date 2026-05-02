#!/usr/bin/env bash
# validate-profile.sh <profile_code>
# Asserts the profile bundle is internally consistent.
set -euo pipefail
CODE="${1:-grc}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/profiles/$CODE"
[ -d "$DIR" ] || { echo "FAIL: $DIR not found"; exit 1; }
ERR=0
echo "validating profile=$CODE @ $DIR"
[ -f "$DIR/workspace-cards.json" ] || { echo "  FAIL workspace-cards.json missing"; ERR=1; }
ls "$DIR/manifests"/*.profile.json >/dev/null 2>&1 || { echo "  FAIL no manifests"; ERR=1; }
grep -l "\"profile_code\":" "$ROOT/profile-shared/dynamic-ui-schema/01_ui_registry.sql" >/dev/null \
  && echo "  OK schema is profile-aware"
for f in "$DIR"/dynamic-ui-seeds/*.sql; do
  [ -f "$f" ] || continue
  if ! grep -q "'$CODE'" "$f"; then
    echo "  FAIL seed missing profile_code='$CODE': $f"; ERR=1
  fi
done
[ $ERR -eq 0 ] && echo "PASS profile=$CODE" || { echo "FAIL profile=$CODE"; exit 1; }
