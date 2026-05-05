#!/usr/bin/env bash
# Repo-local sanity for ops bootstrap shell scripts (CI substitute when no workflows folder).
# Always: bash -n syntax check.
# Optional: shellcheck when present on PATH (skip with single-line notice, exit 0).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SCRIPTS=(
  "platform/config-center/ops/bootstrap/install-temporal-native.sh"
  "platform/config-center/ops/bootstrap/install-langfuse-native.sh"
  "scripts/generate-dev-secrets.sh"
)

fail=0
for f in "${SCRIPTS[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "[ops-shell-sanity] missing file: $f" >&2
    fail=1
    continue
  fi
  if ! bash -n "$f"; then
    echo "[ops-shell-sanity] bash -n failed: $f" >&2
    fail=1
  fi
done

if command -v shellcheck >/dev/null 2>&1; then
  for f in "${SCRIPTS[@]}"; do
    [[ -f "$f" ]] || continue
    shellcheck "$f" || fail=1
  done
else
  echo "[ops-shell-sanity] shellcheck not on PATH — skipping (install shellcheck for optional checks)"
fi

exit "$fail"
