#!/usr/bin/env bash
# Phase 2 / Module 3 (Workflow Engine) — DoD harness.
# Probes the engine surface: instances, chains, root /api/workflow.
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS=$(date +"%Y%m%d_%H%M%S")
. "$SCRIPT_DIR/lib/dod-token.sh"
. "$SCRIPT_DIR/lib/dod-probe.sh"
mint_dod_token || exit $?
probe_dod_endpoints \
  --module workflow-engine \
  --phase  "Phase 2 / Module 3" \
  --out    "$REPO_ROOT/ops/proofs/module-workflow-engine-dod-${TS}.json" \
  -- \
  "workflowInstances:/api/workflow/instances" \
  "workflowChains:/api/workflow-chains/instances" \
  "workflowTasks:/api/workflow/tasks"
