#!/usr/bin/env bash
# Generate development-oriented secret placeholders using OpenSSL only.
# Default: print NAME=value lines to stdout (safe for copy/paste).
# Optional: --write FILE appends a block (explicit opt-in + confirmation).
#
# Usage:
#   bash scripts/generate-dev-secrets.sh
#   bash scripts/generate-dev-secrets.sh --write .env.local.secrets
#
# Never commit files written by --write.

set -euo pipefail

WRITE_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --write)
      shift
      [[ $# -gt 0 ]] || { echo "error: --write requires FILE" >&2; exit 2; }
      WRITE_FILE="$1"
      shift
      ;;
    --help|-h)
      cat <<'USAGE'
Generate development-oriented secrets (openssl only).

Usage:
  bash scripts/generate-dev-secrets.sh              Print block to stdout
  bash scripts/generate-dev-secrets.sh --write FILE Append block (type YES to confirm)

Never commit generated files.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

command -v openssl >/dev/null || { echo "openssl required" >&2; exit 1; }

hex32() { openssl rand -hex 32; }
hex24() { openssl rand -hex 24; }
hex16() { openssl rand -hex 16; }
b64_24() { openssl rand -base64 24 | tr -d '\n'; }

BLOCK="$(cat <<EOF
# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) by scripts/generate-dev-secrets.sh — DO NOT COMMIT
NEXTAUTH_SECRET=$(hex32)
SALT=$(b64_24)
ENCRYPTION_KEY=$(hex32)
TEMPORAL_DB_PASSWORD=$(hex24)
LANGFUSE_DB_PASSWORD=$(hex16)
REDIS_AUTH=$(hex16)
CLICKHOUSE_PASSWORD=$(hex16)
JWT_SECRET=$(hex32)
EOF
)"

if [[ -z "$WRITE_FILE" ]]; then
  printf '%s\n' "$BLOCK"
  exit 0
fi

echo "WARNING: appending secrets to ${WRITE_FILE} — add to .gitignore; never commit." >&2
read -r -p "Type YES to continue: " confirm
[[ "$confirm" == "YES" ]] || { echo "aborted" >&2; exit 1; }

umask 077
touch "$WRITE_FILE"
chmod 600 "$WRITE_FILE" 2>/dev/null || true

{
  echo ""
  echo "$BLOCK"
} >>"$WRITE_FILE"

echo "Appended block to ${WRITE_FILE}" >&2
