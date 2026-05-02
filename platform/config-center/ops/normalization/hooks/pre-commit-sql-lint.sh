#!/usr/bin/env bash
# Pre-commit hook: lint staged migration .sql files and fail fast on M001-M005.
#
# Install (once):
#   ln -s ../../ops/normalization/hooks/pre-commit-sql-lint.sh .git/hooks/pre-commit
# Or chain from husky / lefthook in package.json.
#
# Runs only over STAGED files, so it's O(changed-files) — near-instant.
# Full-repo lint is `make lint` and lives in CI.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Collect staged .sql migrations across the three known roots.
staged=$(git diff --cached --name-only --diff-filter=ACMR \
  | grep -E '^(ops/migrations/|modules/.+/migrations/)' \
  | grep -E '\.sql$' || true)

if [ -z "$staged" ]; then
  exit 0
fi

echo "[pre-commit] linting $(echo "$staged" | wc -l | tr -d ' ') staged migration file(s)"

# Run the linter but only scan staged files via a temporary filter. The
# linter scans the whole repo by default; we use grep against its output
# to restrict errors to staged paths, so we don't block commits on
# pre-existing unrelated warnings.
output=$(npx tsx ops/normalization/scripts/lint-migrations.ts --warn-only 2>&1 || true)

failed=0
while IFS= read -r path; do
  hits=$(echo "$output" | grep -E "^(ERROR|warn ) \[M00[1-5]\] $path:" || true)
  if [ -n "$hits" ]; then
    # Errors block the commit; warnings print but don't.
    errors=$(echo "$hits" | grep '^ERROR' || true)
    echo "$hits"
    if [ -n "$errors" ]; then failed=1; fi
  fi
done <<< "$staged"

if [ "$failed" -ne 0 ]; then
  echo ""
  echo "[pre-commit] blocking commit — fix the M00x errors above, or run:"
  echo "  git commit --no-verify    # only if you are sure"
  exit 1
fi

exit 0
