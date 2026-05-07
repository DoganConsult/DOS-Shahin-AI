#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Tenant Isolation — Static Enforcement Check
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Flags patterns indicating raw safeQuery usage on tenant-scoped data.

Options:
  --help, -h           Show this help message

Environment Variables:
  TENANT_ISOLATION_STRICT  Set to 1 for hard failure (default: 0, fail-open)

Policy:
  - safeQuery() allowed for platform-scoped queries (dos.*, public.tenants)
  - Discouraged when query contains WHERE tenant_id = or "\${schema}"
  - Those markers indicate manual tenant scoping (should use withTenantClient)

Exit codes:
  0 — clean (or warnings in fail-open mode)
  1 — violations found (in strict mode)

Examples:
  # Check with warnings only (fail-open)
  $(basename "$0)

  # Check with hard failure
  TENANT_ISOLATION_STRICT=1 $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

STRICT="${TENANT_ISOLATION_STRICT:-0}"

# Known-OK allowlist: files that are allowed to use raw safeQuery for tenant-scoped
# data during the Phase 11 transition. Each entry is a literal path; extend
# deliberately and remove as conversion completes.
ALLOWLIST=(
  "services/tenant-service/src/domain/settings/runtime-config.service.ts"
  "services/tenant-service/src/domain/ai-gateway/vector-store.service.ts"
  "services/ai-engine-service/src/langgraph/adapters/checkpoint-postgres.ts"
  "services/workflow-service/src/domain/platform/dos/ai-gateway/vector-store.service.ts"
  # Bootstrap: create schema BEFORE a tenant exists; withTenantClient can't be used here.
  "services/onboarding-service/src/jobs/provisioning-worker.ts"
  "services/onboarding-service/src/application/tenant-schema-provisioner.ts"
)

is_allowlisted() {
  local path="$1"
  for entry in "${ALLOWLIST[@]}"; do
    if [ "$path" = "$entry" ]; then
      return 0
    fi
  done
  return 1
}

VIOLATIONS=0
REPORT=""

scan() {
  local pattern="$1"
  local label="$2"

  # Sprint 1 / Track 3E: extend scan to modules/ as well as services/ +
  # packages/. Compliance's contract test caught 6 module-side violations
  # the platform gate had been silently skipping; this widens the gate so
  # other modules can't sneak in similar drift.
  # _inbound/ and _legacy/ are excluded — they are staging trees not
  # active runtime code.
  local hits
  hits=$(grep -rEn --include='*.ts' \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=__tests__ \
    --exclude-dir=_inbound --exclude-dir=_legacy --exclude-dir=_sources \
    "$pattern" services packages modules 2>/dev/null || true)

  if [ -z "$hits" ]; then
    return 0
  fi

  while IFS= read -r line; do
    [ -n "$line" ] || continue
    local path="${line%%:*}"
    if is_allowlisted "$path"; then
      continue
    fi
    REPORT+="  [$label] $line"$'\n'
    VIOLATIONS=$((VIOLATIONS + 1))
  done <<< "$hits"
}

# Pattern 1: safeQuery with template-literal schema interpolation. This is the
# strongest signal that a per-tenant schema query is bypassing withTenantClient.
scan 'safeQuery\(`[^`]*"\$\{[a-zA-Z_]*schema[a-zA-Z_]*\}"' 'raw schema interpolation'
scan "safeQuery\\('[^']*\"\\\$\\{[a-zA-Z_]*schema[a-zA-Z_]*\\}\"" 'raw schema interpolation'

# Pattern 2: safeQuery with __TENANT_SCHEMA__ literal. Indicates an un-rendered
# per-tenant query — almost always a bug (tenant_steps.ts is the legitimate
# substitution site and is already excluded by path filter).
scan 'safeQuery\([^)]*__TENANT_SCHEMA__' 'unrendered tenant schema placeholder'

# Note: `safeQuery(..., WHERE tenant_id = $n, ...)` against dos.* or public.*
# tables is NOT a violation — those tables live outside per-tenant schemas and
# are not covered by migration 020. Only per-tenant schema queries (patterns
# above) must go through withTenantClient.

echo "╔═══════════════════════════════════════════════════╗"
echo "║  Tenant Isolation Check — ADR 006                 ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

if [ $VIOLATIONS -eq 0 ]; then
  echo "✓ No new raw tenant-scoped safeQuery call sites found (outside allowlist)."
  exit 0
fi

echo "⚠  Found $VIOLATIONS call site(s) that should use withTenantClient per ADR 006:"
echo ""
printf '%s' "$REPORT"
echo ""
echo "See ops/docs/ADR/006-tenant-isolation-enforcement.md for the conversion recipe."
echo "To intentionally keep a call site on safeQuery, add the file path to ALLOWLIST in this script."

if [ "$STRICT" = "1" ]; then
  exit 1
fi
exit 0
