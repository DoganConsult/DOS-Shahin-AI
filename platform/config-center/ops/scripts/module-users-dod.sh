#!/usr/bin/env bash
# Module 4 (Users) — DoD harness.
set -u

show_help() {
  cat <<EOF
Usage: $(basename "$0) [OPTIONS]

DoD harness for Phase 1 / Module 4 (Users).

Options:
  --help, -h           Show this help message

Output:
  Creates timestamped proof file at ops/proofs/module-users-dod-<timestamp>.json

Probes:
  user CRUD + FE callers from FoundationApiService and AccessStore

Examples:
  # Run users DoD proof
  $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

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
