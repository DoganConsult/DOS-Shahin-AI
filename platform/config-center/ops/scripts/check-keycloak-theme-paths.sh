#!/usr/bin/env bash
# Keycloak theme path gate — fails if theme.properties has invalid paths.
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

CI guard that checks Keycloak theme.properties for invalid resource paths.

Options:
  --help, -h           Show this help message

Behavior:
  - Scans theme.properties files for styles= and scripts= entries
  - Fails if any entry begins with 'resources/' (double-nests URL)
  - Keycloak already serves from resources/, so prefix causes 404

Exit codes:
  0 — clean
  1 — violations found

Context:
  On 2026-04-23 this bug landed and rendered shahin-ai.com unstyled.

Examples:
  # Check all theme paths
  $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

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
