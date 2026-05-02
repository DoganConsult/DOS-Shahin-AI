#!/usr/bin/env bash
# collect-ha-vm-metadata.sh — collect VM + runtime facts for HA / active-active planning.
# Run on the RUNNING server; share the produced tarball (passwords redacted in the report).
#
# Usage:
#   chmod +x collect-ha-vm-metadata.sh
#   ./collect-ha-vm-metadata.sh
#   # optional: sudo ./collect-ha-vm-metadata.sh
#
# Output: ha-vm-report/ha-vm-report-<UTC>.tar.gz

set -euo pipefail

OUT_DIR="${HA_REPORT_DIR:-ha-vm-report}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="${OUT_DIR}/${TS}"
mkdir -p "${ROOT}"

log() { echo "[*] $*"; }

sanitize_stream() {
  sed -E \
    -e 's/(password|passwd|pwd|secret|token|apikey|api_key|bearer|authorization)\s*[:=]\s*\S+/\1=***REDACTED***/Ig' \
    -e 's/(ConnectionStrings__[^=]+=)([^;]+)/\1***REDACTED***/Ig' \
    -e 's/(POSTGRES_PASSWORD|PGPASSWORD|PGPASSWORD)=.*/\1=***REDACTED***/Ig'
}

append_section() {
  local title="$1"
  shift
  {
    echo "### ${title}"
    echo '```'
    "$@" 2>&1 | sanitize_stream || echo "(failed: $*)"
    echo '```'
    echo
  } >> "${ROOT}/00_MASTER.md"
}

copy_file_redacted() {
  local label="$1" path="$2"
  [[ -f "$path" ]] || return 0
  log "file: ${path}"
  local safe
  safe="$(echo "$path" | sed 's#/#_#g')"
  sanitize_stream <"$path" >"${ROOT}/file_${safe}.txt" || true
  {
    echo "### FILE: ${label}"
    echo "Path: \`${path}\`"
    echo "Also saved as: \`file_${safe}.txt\`"
    echo '```'
    head -n 500 "${ROOT}/file_${safe}.txt"
    echo '```'
    echo
  } >> "${ROOT}/00_MASTER.md"
}

: > "${ROOT}/00_MASTER.md"
{
  echo "# HA VM metadata (running server)"
  echo
  echo "- UTC: \`${TS}\`"
  echo "- Host: \`$(hostname -f 2>/dev/null || hostname)\`"
  echo "- User: \`$(whoami)\`"
  echo
} >> "${ROOT}/00_MASTER.md"

append_section "UNAME" uname -a
append_section "HOSTNAME_FQDN" bash -c 'hostname -f 2>/dev/null || hostname'
append_section "UPTIME" uptime

[[ -f /etc/os-release ]] && copy_file_redacted "/etc/os-release" "/etc/os-release"
command -v lsb_release >/dev/null 2>&1 && append_section "LSB_RELEASE" lsb_release -a

append_section "LSCPU" lscpu
append_section "FREE" free -h
append_section "DF" df -hT
append_section "LSBLK" lsblk -f

append_section "IP_ADDR" ip -br addr
append_section "IP_ROUTE" ip route
append_section "IP_RULE" ip rule || true
[[ -f /etc/resolv.conf ]] && copy_file_redacted "resolv.conf" "/etc/resolv.conf"

append_section "SS_LISTEN_TCP" ss -lntp || true
append_section "SS_LISTEN_UDP" ss -lunp || true

if command -v ufw >/dev/null 2>&1; then
  append_section "UFW" ufw status verbose || true
fi
if command -v firewall-cmd >/dev/null 2>&1; then
  append_section "FIREWALLD" firewall-cmd --list-all || true
fi

if command -v timedatectl >/dev/null 2>&1; then
  append_section "TIMEDATECTL" timedatectl status
fi
if command -v chronyc >/dev/null 2>&1; then
  append_section "CHRONY_SOURCES" chronyc sources || true
fi

append_section "DNS_GOOGLE" getent hosts google.com || true

for f in /etc/nginx/nginx.conf /etc/haproxy/haproxy.cfg /etc/traefik/traefik.yml; do
  copy_file_redacted "$(basename "$f")" "$f"
done

if command -v systemctl >/dev/null 2>&1; then
  append_section "SYSTEMCTL_FAILED" systemctl --failed --no-pager || true
  append_section "SYSTEMD_UNITS_HINT" systemctl list-units --type=service --state=running --no-pager \
    'nginx|haproxy|traefik|postgres|redis|prometheus|grafana|alertmanager|jaeger|loki|clickhouse|dotnet|kestrel|gunicorn|uvicorn' 2>/dev/null || \
    systemctl list-units --type=service --state=running --no-pager | head -n 80 || true
fi

if command -v pm2 >/dev/null 2>&1; then
  append_section "PM2_LIST" pm2 jlist || true
fi

if command -v psql >/dev/null 2>&1; then
  append_section "PSQL_VERSION" psql --version
fi
shopt -s nullglob
for f in /etc/postgresql/*/main/postgresql.conf; do
  copy_file_redacted "postgresql.conf" "$f"
done

for f in /etc/redis/redis.conf /etc/redis.conf; do
  copy_file_redacted "redis.conf" "$f"
done

{
  echo "### ENV_VAR_NAMES (values not printed)"
  echo '```'
  printenv | cut -d= -f1 | sort -u || true
  echo '```'
  echo
} >> "${ROOT}/00_MASTER.md"

# Quick local HTTP probes (non-fatal)
for url in "http://127.0.0.1/" "http://127.0.0.1:5000/" "http://127.0.0.1:8080/" "http://127.0.0.1:5137/"; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' -m 2 "$url" 2>/dev/null || echo "000")"
  echo "- ${url} → HTTP ${code}" >> "${ROOT}/00_MASTER.md"
done
echo >> "${ROOT}/00_MASTER.md"

ARCHIVE="${OUT_DIR}/ha-vm-report-${TS}.tar.gz"
tar -C "${OUT_DIR}" -czf "${ARCHIVE}" "${TS}"
log "Wrote: $(pwd)/${ARCHIVE}"
log "Human-readable: ${ROOT}/00_MASTER.md"
echo
echo "Share this file with your team:"
echo "  ${ARCHIVE}"
echo
echo "If listeners/firewall sections were empty, re-run with: sudo $0"
