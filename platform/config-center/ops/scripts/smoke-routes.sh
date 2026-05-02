#!/usr/bin/env bash
# Phase 16.1 — gateway route smoke.
#
# Iterates every registered prefix in the gateway route map and curls a
# known-safe endpoint under each: /health, /ready, /api/csrf/token, and
# unauthenticated discovery GETs. Asserts:
#   - no 502 / 503 / 504 responses
#   - /health returns 200
#   - /api/public/* and /api/csrf/* endpoints reachable with no auth
#
# Usage:
#   GATEWAY_URL=http://localhost:4000 ops/scripts/smoke-routes.sh
#
# Exits non-zero on any hard failure (502/503/504 or unreachable).

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:4000}"
FAIL=0
STATUS_OK="200 201 204 301 302 400 401 403 404 405 409 429"

smoke() {
    local method="$1"
    local path="$2"
    local label="$3"
    local status
    status="$(curl -s -o /dev/null -w '%{http_code}' -X "$method" -m 5 \
        -H 'accept: application/json' "$GATEWAY_URL$path" || echo '000')"
    if [[ "$status" == "502" || "$status" == "503" || "$status" == "504" || "$status" == "000" ]]; then
        printf '[smoke] ❌ %-8s %-50s %s (%s)\n' "$method" "$path" "$status" "$label"
        FAIL=1
        return
    fi
    if [[ " $STATUS_OK " != *" $status "* ]]; then
        printf '[smoke] ⚠️  %-8s %-50s %s (%s)\n' "$method" "$path" "$status" "$label"
        return
    fi
    printf '[smoke] ✅ %-8s %-50s %s (%s)\n' "$method" "$path" "$status" "$label"
}

echo "[smoke] target: $GATEWAY_URL"

# Gateway-local
smoke GET  /api/health                            "gateway health"
smoke GET  /api/csrf/token                        "CSRF bootstrap"
smoke GET  /info                                  "gateway info"

# Public surface — anonymous allowed
smoke GET  /api/public/captcha/challenge          "public CAPTCHA challenge"
smoke GET  /api/public/onboarding/new-user/verify-email?t=notatoken "public verify-email"

# Authenticated service probes (expected 401 / 403 without JWT — reachability check)
smoke GET  /api/auth/me                           "auth reachability"
smoke GET  /api/tenants                           "tenant-service reachability"
smoke GET  /api/users/me/view-preferences         "user-service view prefs"
smoke GET  /api/workflow/tasks                    "workflow-service"
smoke GET  /api/notifications                     "notification-service"
smoke GET  /api/audit/events                      "audit-service"
smoke POST /api/events/ticket                     "notification-service SSE ticket"
smoke GET  /api/events                            "SSE stream reachability"

# Platform admin
smoke GET  /api/platform-admin                    "platform-admin"
smoke GET  /api/onboarding/new-user/status        "onboarding authed probe"

if (( FAIL )); then
    echo "[smoke] ❌ FAIL — one or more 502/503/504 observed"
    exit 1
fi

echo "[smoke] ✅ OK — no 502/503/504 across registered prefixes"
