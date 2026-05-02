#!/usr/bin/env bash
# Shared helper: probe a list of endpoints with a bearer + emit DoD evidence JSON.
#
# Usage:
#   source "$REPO_ROOT/ops/scripts/lib/dod-token.sh"
#   source "$REPO_ROOT/ops/scripts/lib/dod-probe.sh"
#   mint_dod_token
#   probe_dod_endpoints \
#     --module "<slug>" \
#     --phase  "Phase 1 / Module N" \
#     --out    "$REPO_ROOT/ops/proofs/module-<slug>-dod-${TS}.json" \
#     -- \
#     "name1:/api/path1" \
#     "name2:/api/path2"
#
# PASS criteria (per AGENTS.md §10):
#   200/204 -> PASS
#   401     -> PASS_AUTH_REJECTED  (handler reachable, just permission-gated)
#   403     -> PASS_AUTHZ_ENFORCED
#   404/500/503/000 -> FAIL
#
# Returns 0 on PASS, 1 on FAIL.

probe_dod_endpoints() {
  local module="" phase="" out="" base_url="${BASE_URL:-http://127.0.0.1:4000}"
  while [[ "$1" != "--" ]]; do
    case "$1" in
      --module) module="$2"; shift 2 ;;
      --phase)  phase="$2";  shift 2 ;;
      --out)    out="$2";    shift 2 ;;
      --base)   base_url="$2"; shift 2 ;;
      *) echo "[probe] unknown arg: $1" >&2; return 2 ;;
    esac
  done
  shift # consume --

  if [ -z "$TOKEN" ]; then echo "[probe] no TOKEN in env — call mint_dod_token first" >&2; return 2; fi

  local tmp
  tmp=$(mktemp -d)
  local idx=0
  local lines=()
  for row in "$@"; do
    local name="${row%%:*}"
    local ep="${row#*:}"
    local fn="$tmp/${idx}_${name}.json"
    local start end ms code
    start=$(date +%s%N)
    code=$(curl -sS -o "$fn" -w "%{http_code}" --max-time 8 \
           -H "Authorization: Bearer $TOKEN" -H "Host: shahin-ai.com" \
           "$base_url$ep")
    end=$(date +%s%N)
    ms=$(( (end - start) / 1000000 ))
    lines+=("$name|$ep|$code|$ms|$fn")
    echo "[probe] [$code] ${ms}ms $name  $ep"
    idx=$((idx+1))
  done

  python3 - "$module" "$phase" "$out" "$TID" "$ROLE" "$ISS" "$DOD_USER" "${lines[@]}" <<'PY'
import json, os, sys, datetime
module, phase, out, tid, role, iss, user = sys.argv[1:8]
rows = sys.argv[8:]

def cls(code):
    c = int(code)
    if c in (200, 204): return 'PASS'
    if c == 401:        return 'PASS_AUTH_REJECTED'
    if c == 403:        return 'PASS_AUTHZ_ENFORCED'
    return 'FAIL'

endpoints = []
fails = []
for line in rows:
    name, ep, code, ms, fn = line.split('|', 4)
    sample = ''
    if os.path.exists(fn):
        try:
            data = json.load(open(fn))
            if isinstance(data, dict):
                for k, v in data.items():
                    if isinstance(v, list):
                        sample = f"{k}: list[{len(v)}]"; break
                if not sample:
                    sample = f"keys: {sorted(list(data.keys()))[:6]}"
            elif isinstance(data, list):
                sample = f"list[{len(data)}]"
        except Exception:
            sample = "non-json"
    verdict = cls(code)
    endpoints.append({
        'name': name, 'path': ep, 'status': int(code), 'ms': int(ms),
        'verdict': verdict, 'sample': sample,
    })
    if verdict == 'FAIL':
        fails.append(name)

verdict = 'PASS' if not fails else 'FAIL'
result = {
    'module': module, 'phase': phase,
    'completedAt': datetime.datetime.utcnow().isoformat() + 'Z',
    'verdict': verdict, 'tenant': tid, 'user': user, 'role': role, 'issuer': iss,
    'endpointCount': len(rows),
    'passCount': len(rows) - len(fails),
    'failCount': len(fails),
    'failingEndpoints': fails,
    'endpoints': endpoints,
}
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(result, open(out, 'w'), indent=2)
print(f"[probe] verdict: {verdict}", file=sys.stderr)
PY
  local rc=$?
  rm -rf "$tmp"

  echo "[probe] wrote $out"
  local final_verdict
  final_verdict=$(python3 -c "import json; print(json.load(open('$out'))['verdict'])" 2>/dev/null)
  [ "$final_verdict" = "PASS" ] && return 0 || return 1
}
