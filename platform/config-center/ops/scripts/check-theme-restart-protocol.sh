#!/usr/bin/env bash
#
# Theme restart protocol gate.
#
# Fails if any file under ops/keycloak-themes/** has changed in the working
# tree (or in a commit range) WITHOUT a corresponding bump to
# ops/keycloak/.theme-version. The version stamp is written by
# ops/keycloak/build-theme.sh ONLY after a successful deploy + restart, so
# bumping it without running the script is a footgun the gate cannot detect —
# but at least it forces an explicit acknowledgment that the deploy ran.
#
# Why this exists:
#   On 2026-04-23 the Dogan theme.properties was edited in the working tree
#   to fix a `styles=` typo, but never deployed. Keycloak kept serving the
#   broken file, the registration page rendered unstyled, and the auto-sync
#   committer landed the change without any deploy. This gate prevents that
#   class of problem from recurring.
#
# Usage:
#   ops/scripts/check-theme-restart-protocol.sh                 # check working tree
#   ops/scripts/check-theme-restart-protocol.sh <BASE>..HEAD    # check a commit range
#
# Exit codes:
#   0  no theme files changed, OR theme files changed AND .theme-version bumped
#   1  theme files changed but .theme-version unchanged

set -euo pipefail

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
