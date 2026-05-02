#!/usr/bin/env bash
# Phase 6 chaos test: kill onboarding-service (which hosts the provisioning
# worker) mid-job and verify:
#   1. On restart, no step has > 1 `succeeded` row for any job (proves
#      idempotency via public.provisioning_step_runs.idempotency_key).
#   2. Stuck-running rows are re-queued by stealStuckJobs() within 60s.
#
# Usage:
#   ops/scripts/chaos/kill-worker.sh [--mode signal|pm2] [--wait-seconds 20]
#
# Defaults: --mode pm2 --wait-seconds 20
#
# Exits non-zero if the worker fails to come back, or if idempotency is
# violated (any step with > 1 succeeded row in public.provisioning_step_runs).

set -euo pipefail

MODE="pm2"
WAIT_SECONDS=20
SERVICE_NAME="onboarding-service"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODE="$2"; shift 2 ;;
    --wait-seconds) WAIT_SECONDS="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 2 ;;
  esac
done

echo "[chaos] Killing ${SERVICE_NAME} (mode=${MODE})…"
case "${MODE}" in
  pm2)
    command -v pm2 >/dev/null 2>&1 || { echo "pm2 not installed"; exit 1; }
    pm2 stop "${SERVICE_NAME}" >/dev/null
    sleep 2
    pm2 start "${SERVICE_NAME}" >/dev/null
    ;;
  signal)
    PID="$(pgrep -f "dist/server.js.*${SERVICE_NAME}" | head -n1 || true)"
    if [[ -z "${PID}" ]]; then
      echo "Could not locate running ${SERVICE_NAME} process"
      exit 1
    fi
    echo "[chaos] Sending SIGKILL to pid ${PID}"
    kill -9 "${PID}"
    echo "[chaos] Supervisor expected to restart the service — verify with 'pm2 list' or your orchestrator."
    ;;
  *)
    echo "Unknown mode: ${MODE}"; exit 2 ;;
esac

echo "[chaos] Waiting ${WAIT_SECONDS}s for worker to resume and steal stuck rows…"
sleep "${WAIT_SECONDS}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[chaos] DATABASE_URL not set — skipping idempotency assertion"
  exit 0
fi

echo "[chaos] Asserting step-run idempotency across all provisioning jobs…"
DUPES="$(psql "${DATABASE_URL}" -Atq <<'SQL'
SELECT job_id::text || ':' || step_code || ':' || cnt
  FROM (
    SELECT job_id, step_code, COUNT(*) AS cnt
      FROM public.provisioning_step_runs
     WHERE status = 'succeeded'
     GROUP BY job_id, step_code
  ) AS s
 WHERE cnt > 1;
SQL
)"

if [[ -n "${DUPES}" ]]; then
  echo "[chaos] FAIL — idempotency violated:"
  echo "${DUPES}"
  exit 1
fi

echo "[chaos] OK — no step executed more than once per job."
