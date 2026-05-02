#!/usr/bin/env bash
# Phase 0.1 — tag the repo before destructive foundation-extract steps.
# Safe to re-run; fails fast if the tag already exists OR the workspace
# is not a git checkout.
set -euo pipefail

TAG="${1:-pre-foundation-extract-$(date -u +%Y%m%d)}"

if [[ ! -d .git ]]; then
  echo "[foundation-extract-tag] .git directory not present — skipping tag." >&2
  echo "[foundation-extract-tag] run from a fresh clone: git clone ... && cd repo && ops/setup/foundation-extract-tag.sh" >&2
  exit 0
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "[foundation-extract-tag] tag $TAG already exists — no action."
  exit 0
fi

git tag -a "$TAG" -m "Pre-foundation-extract snapshot ($(date -u))"
echo "[foundation-extract-tag] tagged $TAG"
git show-ref --tags "$TAG"
