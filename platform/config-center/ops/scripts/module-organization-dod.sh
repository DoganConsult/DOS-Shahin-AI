#!/usr/bin/env bash
# Module 3 (Organization) — DoD harness.
# Probes the org-tree CRUD endpoints the Foundation Org pages depend on:
#   organizations / business-units / departments / positions / locations /
#   committees / ownership-mappings / org-hierarchy.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module organization \
  --phase  "Phase 1 / Module 3" \
  --out    "$REPO_ROOT/ops/proofs/module-organization-dod-${TS}.json" \
  -- \
  "organizations:/api/organizations" \
  "businessUnits:/api/business-units" \
  "departments:/api/foundation/departments" \
  "positions:/api/positions" \
  "locations:/api/locations" \
  "committees:/api/committees" \
  "ownership:/api/ownership-mappings"
# Note: orgHierarchyRouter has only GET /:scopeType/:scopeId — bare
# /api/foundation/org-hierarchy is intentionally 404. The FE doesn't
# call it bare; if added later, parameterise the probe.
