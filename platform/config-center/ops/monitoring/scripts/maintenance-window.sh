#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# DOS Platform — Maintenance Window Manager
# Creates/expires Alertmanager silences to suppress alerts during
# planned maintenance.
#
# Usage:
#   ./maintenance-window.sh create <service> <duration_minutes> [comment]
#   ./maintenance-window.sh list
#   ./maintenance-window.sh expire <silence_id>
#
# Examples:
#   ./maintenance-window.sh create gateway 60 "Deploying v2.1.0"
#   ./maintenance-window.sh create auth-service 30
#   ./maintenance-window.sh list
#   ./maintenance-window.sh expire abc-123-def
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"

usage() {
  echo "Usage:"
  echo "  $0 create <service> <duration_minutes> [comment]"
  echo "  $0 list"
  echo "  $0 expire <silence_id>"
  exit 1
}

create_silence() {
  local SERVICE="$1"
  local DURATION="${2:-60}"
  local COMMENT="${3:-Scheduled maintenance}"

  local START
  START=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
  local END
  END=$(date -u -d "+${DURATION} minutes" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || \
       date -u -v "+${DURATION}M" +"%Y-%m-%dT%H:%M:%S.000Z")

  local RESPONSE
  RESPONSE=$(curl -s -X POST "${ALERTMANAGER_URL}/api/v2/silences" \
    -H "Content-Type: application/json" \
    -d "{
      \"matchers\": [{\"name\": \"job\", \"value\": \"${SERVICE}\", \"isRegex\": false}],
      \"startsAt\": \"${START}\",
      \"endsAt\": \"${END}\",
      \"createdBy\": \"maintenance-window-script\",
      \"comment\": \"${COMMENT}\"
    }")

  echo "Silence created for '${SERVICE}' until ${END}:"
  echo "${RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${RESPONSE}"
}

list_silences() {
  local RESPONSE
  RESPONSE=$(curl -s "${ALERTMANAGER_URL}/api/v2/silences")
  echo "Active silences:"
  echo "${RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${RESPONSE}"
}

expire_silence() {
  local SILENCE_ID="$1"
  curl -s -X DELETE "${ALERTMANAGER_URL}/api/v2/silence/${SILENCE_ID}"
  echo "Silence ${SILENCE_ID} expired."
}

[[ $# -lt 1 ]] && usage

case "$1" in
  create)
    [[ $# -lt 3 ]] && { echo "Error: create requires <service> <duration_minutes>"; usage; }
    create_silence "$2" "$3" "${4:-Scheduled maintenance}"
    ;;
  list)
    list_silences
    ;;
  expire)
    [[ $# -lt 2 ]] && { echo "Error: expire requires <silence_id>"; usage; }
    expire_silence "$2"
    ;;
  *)
    usage
    ;;
esac
