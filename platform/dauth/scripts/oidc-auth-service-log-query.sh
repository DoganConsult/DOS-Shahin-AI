#!/usr/bin/env bash
# OIDC TOKEN_EXCHANGE_FAILED — example log grep for operators.
# Usage:
#   NS=my-namespace APP=auth-service CID=oidc-cb-xxxx ./oidc-auth-service-log-query.sh
# Or pass correlation id as first arg:
#   NS=... APP=... ./oidc-auth-service-log-query.sh oidc-cb-moctbxg5-0ivlj1

set -euo pipefail

CID="${1:-${CID:-}}"
NS="${NS:-}"
APP="${APP:-auth-service}"

if [[ -z "$NS" ]]; then
  echo "Set NS to your Kubernetes namespace, e.g. NS=dogan-platform $0 [correlation-id]" >&2
  exit 1
fi

PATTERN='\[oidc\.callback\] code exchange failed|\[oidc\] token_exchange_keycloak_response|\[oidc\.callback\] redirect_uri drift'
if [[ -n "$CID" ]]; then
  PATTERN="$CID|$PATTERN"
fi

echo "# kubectl -n $NS logs (recent pods) — pattern: $PATTERN"
kubectl -n "$NS" logs "deploy/$APP" --since=3h --timestamps=true 2>/dev/null | grep -E "$PATTERN" || {
  echo "(no matches — widen --since or check pod label / deployment name)" >&2
  exit 0
}
