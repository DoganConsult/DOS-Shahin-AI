#!/usr/bin/env bash
# Module 6 (Roles & Permissions) — DoD harness.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module roles-permissions \
  --phase  "Phase 1 / Module 6" \
  --out    "$REPO_ROOT/ops/proofs/module-roles-permissions-dod-${TS}.json" \
  -- \
  "myPermissions:/api/access/my-permissions" \
  "accessSnapshot:/api/foundation/access-snapshot" \
  "profilesRoles:/api/profiles/roles" \
  "roles:/api/roles" \
  "foundationRoles:/api/foundation/roles" \
  "delegations:/api/governance/delegations"
