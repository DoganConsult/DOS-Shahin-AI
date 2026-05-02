#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Source this file after setting SCRIPT_DIR and REPO_ROOT (ops/scripts + repo root).
# Calls dos_load_pm2_service_array to populate bash array SERVICES as "name:port"
# lines from ops/ecosystem.*.config.js via list-pm2-health-targets.mjs (single source).
#
# Optional: export ECOSYSTEM_CONFIG before sourcing (defaults to $REPO_ROOT/ops/ecosystem.all.config.js).
# ─────────────────────────────────────────────────────────────────────────────

dos_load_pm2_service_array() {
  if [[ -z "${REPO_ROOT:-}" ]] || [[ -z "${SCRIPT_DIR:-}" ]]; then
    echo "dos_load_pm2_service_array: set REPO_ROOT and SCRIPT_DIR before sourcing load-pm2-service-list.sh" >&2
    return 2
  fi
  ECOSYSTEM_CONFIG="${ECOSYSTEM_CONFIG:-$REPO_ROOT/ops/ecosystem.all.config.js}"
  if [[ "${ECOSYSTEM_CONFIG}" != /* ]]; then
    ECOSYSTEM_CONFIG="$REPO_ROOT/${ECOSYSTEM_CONFIG#./}"
  fi
  export ECOSYSTEM_CONFIG
  if ! mapfile -t SERVICES < <(node "$SCRIPT_DIR/list-pm2-health-targets.mjs"); then
    echo "dos_load_pm2_service_array: failed to read ecosystem (ECOSYSTEM_CONFIG=$ECOSYSTEM_CONFIG)" >&2
    return 2
  fi
  if [[ "${#SERVICES[@]}" -eq 0 ]]; then
    echo "dos_load_pm2_service_array: no apps with ports in ecosystem file" >&2
    return 2
  fi
  return 0
}
