#!/usr/bin/env bash
#
# Keycloak theme path gate — fails if any theme.properties `styles=` or
# `scripts=` entry begins with `resources/`. Keycloak already serves theme
# files from the theme's resources/ dir, so adding the prefix double-nests
# the URL (/resources/<ver>/<type>/<name>/resources/css/x.css → 404 with
# empty Content-Type → browser refuses stylesheet under strict MIME check).
#
# Context: on 2026-04-23 this exact bug landed in
# ops/keycloak-themes/dogan/login/theme.properties via an auto-sync commit
# and rendered shahin-ai.com's registration page unstyled.
#
# Usage: ops/scripts/check-keycloak-theme-paths.sh
# Exit:  0 clean, 1 violations found.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VIOLATIONS=0

scan_one() {
  local file="$1"
  # Only inspect styles= and scripts= lines. Pull each space-separated entry
  # and flag any that starts with "resources/".
  awk -F= '
    $1 == "styles" || $1 == "scripts" {
      key = $1
      $1 = ""; sub(/^=/, "")
      val = $0
      n = split(val, parts, /[[:space:]]+/)
      for (i = 1; i <= n; i++) {
        if (parts[i] == "") continue
        if (parts[i] ~ /^resources\//) {
          printf("%s\t%s\t%s\n", FILENAME, key, parts[i])
        }
      }
    }
  ' "$file"
}

while IFS= read -r -d '' f; do
  out="$(scan_one "$f")"
  if [[ -n "$out" ]]; then
    while IFS=$'\t' read -r vfile vkey vval; do
      echo "::error file=$vfile::$vkey entry '$vval' has redundant 'resources/' prefix — Keycloak appends it automatically, so this double-nests the URL and returns 404. Drop the prefix."
      VIOLATIONS=$((VIOLATIONS + 1))
    done <<<"$out"
  fi
done < <(find "$REPO_ROOT/ops" -path '*/themes/*/theme.properties' -type f -print0 2>/dev/null)

# Also sweep login/ subdir variant (theme.properties lives one level under login/)
while IFS= read -r -d '' f; do
  out="$(scan_one "$f")"
  if [[ -n "$out" ]]; then
    while IFS=$'\t' read -r vfile vkey vval; do
      echo "::error file=$vfile::$vkey entry '$vval' has redundant 'resources/' prefix — Keycloak appends it automatically, so this double-nests the URL and returns 404. Drop the prefix."
      VIOLATIONS=$((VIOLATIONS + 1))
    done <<<"$out"
  fi
done < <(find "$REPO_ROOT/ops" -path '*/login/theme.properties' -type f -print0 2>/dev/null)

if [[ $VIOLATIONS -gt 0 ]]; then
  echo ""
  echo "Keycloak theme path gate: $VIOLATIONS violation(s) — fix before commit." >&2
  exit 1
fi

echo "Keycloak theme path gate: OK"
exit 0
