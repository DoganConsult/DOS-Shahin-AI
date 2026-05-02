#!/usr/bin/env bash
# Module 8 (Audit Trail) — DoD harness.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module audit-trail \
  --phase  "Phase 1 / Module 8" \
  --out    "$REPO_ROOT/ops/proofs/module-audit-trail-dod-${TS}.json" \
  -- \
  "audit:/api/audit-trail" \
  "auditPaginated:/api/audit-trail?limit=20" \
  "auditDeep:/api/audit-trail?limit=50&offset=0"
