#!/usr/bin/env bash
# Theme restart protocol gate.
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0) [commit-range] [OPTIONS]

CI gate that ensures theme changes are accompanied by .theme-version bump.

Arguments:
  commit-range          Git commit range (e.g., HEAD~1..HEAD). If omitted, checks working tree.

Options:
  --help, -h           Show this help message

Behavior:
  - Fails if theme files changed without .theme-version bump
  - Version stamp written by ops/keycloak/build-theme.sh after deploy + restart
  - Prevents landing theme changes without deploy acknowledgment

Exit codes:
  0 — no theme files changed, OR theme files changed AND .theme-version bumped
  1 — theme files changed but .theme-version unchanged

Context:
  On 2026-04-23 a theme change landed without deploy, rendering shahin-ai.com unstyled.

Examples:
  # Check working tree
  $(basename "$0)

  # Check a commit range
  $(basename "$0) HEAD~1..HEAD
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RANGE="${1:-}"

cd "$REPO_ROOT"

if [[ -n "$RANGE" ]]; then
  CHANGED=$(git diff --name-only "$RANGE" -- 'ops/keycloak-themes/**' 2>/dev/null || true)
  STAMP_CHANGED=$(git diff --name-only "$RANGE" -- 'ops/keycloak/.theme-version' 2>/dev/null || true)
else
  # Working tree + index against HEAD
  CHANGED=$(git diff --name-only HEAD -- 'ops/keycloak-themes/**' 2>/dev/null || true)
  CHANGED+=$'\n'$(git ls-files --others --exclude-standard -- 'ops/keycloak-themes/**' 2>/dev/null || true)
  STAMP_CHANGED=$(git diff --name-only HEAD -- 'ops/keycloak/.theme-version' 2>/dev/null || true)
fi

# Trim blank lines
CHANGED=$(echo "$CHANGED" | grep -v '^$' || true)

if [[ -z "$CHANGED" ]]; then
  echo "theme-restart-protocol: OK (no theme changes)"
  exit 0
fi

if [[ -z "$STAMP_CHANGED" ]]; then
  echo "theme-restart-protocol: VIOLATION" >&2
  echo "" >&2
  echo "Theme files changed but ops/keycloak/.theme-version was not updated." >&2
  echo "Run ops/keycloak/build-theme.sh to deploy + restart Keycloak (this" >&2
  echo "writes the version stamp), then commit the stamp with the changes." >&2
  echo "" >&2
  echo "Changed theme files:" >&2
  echo "$CHANGED" | sed 's/^/  /' >&2
  exit 1
fi

echo "theme-restart-protocol: OK (theme changes paired with .theme-version bump)"
