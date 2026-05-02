#!/usr/bin/env bash
# Phase 2 / Module 1 (Tasks) — DoD harness.
# Probes the workflow + tasks endpoints actually called by Shahin pages.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module tasks \
  --phase  "Phase 2 / Module 1" \
  --out    "$REPO_ROOT/ops/proofs/module-tasks-dod-${TS}.json" \
  -- \
  "workflowTasks:/api/workflow/tasks" \
  "workflowInstances:/api/workflow/instances" \
  "approvals:/api/approvals" \
  "approvalRequests:/api/approval-requests" \
  "workflowChains:/api/workflow-chains/instances"
