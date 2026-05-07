#!/usr/bin/env bash
# Tenant isolation gate — fails if bare safeQuery appears in service src.
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") <service-dir> [OPTIONS]

CI guard that fails if bare safeQuery() or query() appears in service src.

Arguments:
  service-dir          Service directory to check (e.g., services/user-service)

Options:
  --help, -h           Show this help message

Behavior:
  - Fails if bare safeQuery() or query() from @dos/db appears in src/
  - These bypass per-tenant search_path set by withTenantClient
  - Allowed: withTenantClient usage and infra-only paths (server.ts healthcheck)

Exit codes:
  0 — clean
  1 — violations found
  2 — bad args

Examples:
  # Check user-service
  $(basename "$0) services/user-service

  # Check auth-service
  $(basename "$0) services/auth-service
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <service-dir>" >&2
  exit 2
fi

SRC_ROOT="$1/src"
if [[ ! -d "$SRC_ROOT" ]]; then
  echo "Not a directory: $SRC_ROOT" >&2
  exit 2
fi

# Paths that are permitted to call top-level query/safeQuery. Keep narrow.
ALLOWLIST=(
  "src/server.ts"             # health-check SELECT 1 does not need tenant scope
)

is_allowed() {
  local path="$1"
  for allow in "${ALLOWLIST[@]}"; do
    if [[ "$path" == *"/$allow" ]]; then return 0; fi
  done
  return 1
}

# Match `safeQuery(` OR `\.query(` where the query is the top-level pg pool.query
# (i.e., `query(` called directly with `import { query } from '@dos/db'`).
# We detect the former cheaply with grep; the latter by checking files that
# import `query` from `@dos/db`.

VIOLATIONS=0

# Strip block + line comments before matching so doc references don't trigger
# false positives. Cheap and good enough for a lint gate.
strip_comments() {
  awk '
    BEGIN { inblock = 0 }
    {
      line = $0
      out = ""
      i = 1
      while (i <= length(line)) {
        if (inblock) {
          p = index(substr(line, i), "*/")
          if (p == 0) { i = length(line) + 1 }
          else       { inblock = 0; i = i + p + 1 }
        } else {
          p = index(substr(line, i), "/*")
          q = index(substr(line, i), "//")
          if (q > 0 && (p == 0 || q < p)) {
            out = out substr(line, i, q - 1)
            i = length(line) + 1
          } else if (p > 0) {
            out = out substr(line, i, p - 1)
            i = i + p + 1
            inblock = 1
          } else {
            out = out substr(line, i)
            i = length(line) + 1
          }
        }
      }
      print out
    }
  ' "$1"
}

# 1. Bare safeQuery(
while IFS= read -r -d '' file; do
  if is_allowed "$file"; then continue; fi
  if strip_comments "$file" | grep -qE '\bsafeQuery\s*\('; then
    echo "::error file=$file::bare safeQuery(...) found — use withTenantClient instead"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < <(find "$SRC_ROOT" -type f \( -name '*.ts' -o -name '*.tsx' \) -print0)

# 2. Top-level `query` imported from @dos/db
while IFS= read -r -d '' file; do
  if is_allowed "$file"; then continue; fi
  if grep -qE "import[[:space:]]*\{[^}]*\bquery\b[^}]*\}[[:space:]]*from[[:space:]]*['\"]@dos/db['\"]" "$file"; then
    if strip_comments "$file" | grep -qE "(^|[^a-zA-Z0-9_.])query\s*\("; then
      echo "::error file=$file::top-level query(...) from @dos/db found — use withTenantClient instead"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
done < <(find "$SRC_ROOT" -type f \( -name '*.ts' -o -name '*.tsx' \) -print0)

if [[ $VIOLATIONS -gt 0 ]]; then
  echo ""
  echo "Tenant isolation gate: $VIOLATIONS violation(s) — merge blocked." >&2
  exit 1
fi

echo "Tenant isolation gate: OK ($(find "$SRC_ROOT" -name '*.ts' -type f | wc -l) files scanned, 0 violations)"
exit 0
