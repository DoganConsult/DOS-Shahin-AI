#!/usr/bin/env bash
# Module 4 (Users) — DoD harness.
# Probes user CRUD + the FE callers from FoundationApiService and AccessStore.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
# tenantadmin's own user_id for the user-detail probe
SELF_ID="cf36d194-391d-42f6-b8df-267635bde169"
probe_dod_endpoints \
  --module users \
  --phase  "Phase 1 / Module 4" \
  --out    "$REPO_ROOT/ops/proofs/module-users-dod-${TS}.json" \
  -- \
  "users:/api/users" \
  "foundationUsers:/api/foundation/users" \
  "userDetail:/api/foundation/users/$SELF_ID" \
  "userTeams:/api/foundation/users/$SELF_ID/teams" \
  "userTasks:/api/foundation/users/$SELF_ID/tasks" \
  "invitations:/api/invitations"
