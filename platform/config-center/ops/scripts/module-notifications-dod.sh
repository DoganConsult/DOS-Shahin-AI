#!/usr/bin/env bash
# Module 7 (Notifications) — DoD harness.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module notifications \
  --phase  "Phase 1 / Module 7" \
  --out    "$REPO_ROOT/ops/proofs/module-notifications-dod-${TS}.json" \
  -- \
  "notifications:/api/notifications"
# Only /api/notifications is FE-called. /notifications/unread-count and
# /notification-inbox don't appear in any FE source (grep verified across
# frontend/products/shahin/src + modules/notification/source/frontend).
