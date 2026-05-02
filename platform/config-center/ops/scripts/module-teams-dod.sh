#!/usr/bin/env bash
# Module 5 (Teams) — DoD harness.
# Probes the team CRUD endpoints the Teams page depends on.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module teams \
  --phase  "Phase 1 / Module 5" \
  --out    "$REPO_ROOT/ops/proofs/module-teams-dod-${TS}.json" \
  -- \
  "teams:/api/teams" \
  "foundationTeams:/api/foundation/teams" \
  "departments:/api/foundation/departments"
