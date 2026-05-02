#!/usr/bin/env bash
# Phase 2 / Module 4 (Notifications — workflow events fire) — DoD harness.
# Phase 1 verified the inbox endpoint; this harness re-probes plus checks
# the unread + filter shapes the workflow inbox UI consumes.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module workflow-notifications \
  --phase  "Phase 2 / Module 4" \
  --out    "$REPO_ROOT/ops/proofs/module-workflow-notifications-dod-${TS}.json" \
  -- \
  "notifications:/api/notifications" \
  "notificationsLimited:/api/notifications?limit=20"
