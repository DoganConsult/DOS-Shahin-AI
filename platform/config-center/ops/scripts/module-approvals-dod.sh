#!/usr/bin/env bash
# Phase 2 / Module 2 (Approvals) — DoD harness.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module approvals \
  --phase  "Phase 2 / Module 2" \
  --out    "$REPO_ROOT/ops/proofs/module-approvals-dod-${TS}.json" \
  -- \
  "approvals:/api/approvals" \
  "approvalRequests:/api/approval-requests"
