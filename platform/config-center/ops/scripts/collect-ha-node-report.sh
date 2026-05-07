#!/usr/bin/env bash
set -Eeuo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Collects HA node report with system info, logs, and configuration.

Options:
  --help, -h           Show this help message

Environment Variables:
  OUT_DIR              Output directory (default: ha-node-report)

Output:
  Creates timestamped directory with:
  - 00_MASTER.md (collected system info)
  - Sanitized copies of configuration files

Examples:
  # Collect HA node report
  $(basename "$0)

  # Custom output directory
  OUT_DIR=/custom/path $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

OUT_DIR="${OUT_DIR:-ha-node-report}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
ROOT="${OUT_DIR}/${TS}"
MASTER="${ROOT}/00_MASTER.md"

mkdir -p "$ROOT"
: > "$MASTER"

log() {
  echo "[*] $*"
}

section() {
  local title="$1"
  shift
  log "Collecting: $title"
  {
    echo
    echo "## $title"
    echo '```'
    "$@" 2>&1 || echo "(command failed: $*)"
    echo '```'
  } >> "$MASTER"
}

sanitize_copy() {
  local src="$1"
  local name
  name="$(echo "$src" | sed 's#/#_#g' | sed 's#^_##')"

  [[ -f "$src" ]] || return 0

  log "Copying sanitized file: $src"

  {
    echo
    echo "## FILE: $src"
    echo '```'
    sed -E \
      -e 's/(password|passwd|pwd|secret|token|apikey|api_key|authorization|bearer|private_key|client_secret|access_key|secret_key)[[:space:]]*[:=][[:space:]]*.*/\1=***REDACTED***/Ig' \
      -e 's#(postgres://[^:]+:)[^@]+@#\1***REDACTED***@#Ig' \
      -e 's#(redis://[^:]+:)[^@]+@#\1***REDACTED***@#Ig' \
      -e 's#(mongodb://[^:]+:)[^@]+@#\1***REDACTED***@#Ig' \
      "$src" 2>/dev/null || echo "(failed to read file)"
    echo '```'
  } >> "$MASTER"

  sed -E \
    -e 's/(password|passwd|pwd|secret|token|apikey|api_key|authorization|bearer|private_key|client_secret|access_key|secret_key)[[:space:]]*[:=][[:space:]]*.*/\1=***REDACTED***/Ig' \
    -e 's#(postgres://[^:]+:)[^@]+@#\1***REDACTED***@#Ig' \
    -e 's#(redis://[^:]+:)[^@]+@#\1***REDACTED***@#Ig' \
    -e 's#(mongodb://[^:]+:)[^@]+@#\1***REDACTED***@#Ig' \
    "$src" > "${ROOT}/${name}.sanitized.txt" 2>/dev/null || true
}

echo "# HA Node Discovery Report" >> "$MASTER"
echo "" >> "$MASTER"
echo "- Collected UTC: $TS" >> "$MASTER"
echo "- Hostname: $(hostname -f 2>/dev/null || hostname)" >> "$MASTER"
echo "- User: $(whoami)" >> "$MASTER"
echo "" >> "$MASTER"

# =========================================================
# 1. Host identity / OS / resources
# =========================================================
section "Hostname" bash -lc 'hostname; hostname -f 2>/dev/null || true'
section "OS Release" bash -lc 'cat /etc/os-release 2>/dev/null || true; lsb_release -a 2>/dev/null || true'
section "Kernel" uname -a
section "Uptime" uptime
section "CPU" lscpu
section "Memory" free -h
section "Disk usage" df -hT
section "Block devices" lsblk -f
section "Mounts" findmnt

# =========================================================
# 2. Network
# =========================================================
section "IP addresses" ip -br addr
section "IP routes" ip route
section "IP rules" bash -lc 'ip rule || true'
section "DNS resolver config" bash -lc 'cat /etc/resolv.conf 2>/dev/null || true'
section "Hosts file" bash -lc 'cat /etc/hosts 2>/dev/null || true'
section "Listening TCP ports" bash -lc 'ss -lntp || true'
section "Listening UDP ports" bash -lc 'ss -lunp || true'
section "Established connections summary" bash -lc 'ss -antp | head -300 || true'
section "Public IP check" bash -lc 'curl -4 -s --max-time 5 https://ifconfig.me || curl -4 -s --max-time 5 https://api.ipify.org || true; echo'

# =========================================================
# 3. Firewall / security
# =========================================================
section "UFW status" bash -lc 'ufw status verbose 2>/dev/null || true'
section "iptables rules" bash -lc 'iptables -S 2>/dev/null || true'
section "nftables rules" bash -lc 'nft list ruleset 2>/dev/null || true'
section "firewalld status" bash -lc 'firewall-cmd --list-all 2>/dev/null || true'

# =========================================================
# 4. Time sync
# =========================================================
section "Time sync" bash -lc 'date -Is; timedatectl status 2>/dev/null || true; chronyc sources 2>/dev/null || true'

# =========================================================
# 5. System services
# =========================================================
section "Systemd failed services" bash -lc 'systemctl --failed --no-pager || true'
section "Systemd running services" bash -lc 'systemctl list-units --type=service --state=running --no-pager || true'
section "Important service status" bash -lc '
for s in nginx haproxy postgresql redis-server redis pm2-root pm2-$USER keycloak nats-server rabbitmq-server patroni etcd consul prometheus alertmanager grafana-server jaeger loki clickhouse-server; do
  systemctl status "$s" --no-pager 2>/dev/null | sed -n "1,35p" || true
done
'

# =========================================================
# 6. Reverse proxy / load balancer configs
# =========================================================
for f in \
  /etc/nginx/nginx.conf \
  /etc/haproxy/haproxy.cfg \
  /etc/traefik/traefik.yml \
  /etc/traefik/traefik.yaml
do
  sanitize_copy "$f"
done

section "Nginx sites" bash -lc 'ls -la /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true'
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*; do
  [[ -f "$f" ]] && sanitize_copy "$f"
done

# =========================================================
# 7. Node / PM2 / app runtime
# =========================================================
section "Node versions" bash -lc 'node -v 2>/dev/null || true; npm -v 2>/dev/null || true; pnpm -v 2>/dev/null || true; yarn -v 2>/dev/null || true'
section "PM2 version" bash -lc 'pm2 -v 2>/dev/null || true'
section "PM2 list" bash -lc 'pm2 list 2>/dev/null || true'
section "PM2 detailed JSON sanitized" bash -lc '
pm2 jlist 2>/dev/null \
| sed -E "s/(password|passwd|pwd|secret|token|apikey|api_key|authorization|bearer|client_secret)[^,\"]*/\1***REDACTED***/Ig" \
|| true
'
section "PM2 startup" bash -lc 'pm2 startup 2>/dev/null || true'
section "PM2 saved dump location" bash -lc 'ls -la ~/.pm2 2>/dev/null || true'

section "Common app directories" bash -lc '
for d in /root /opt /srv /var/www /home; do
  echo "### $d"
  find "$d" -maxdepth 3 -type f \( \
    -name "package.json" -o \
    -name "ecosystem.config.js" -o \
    -name "ecosystem.config.cjs" -o \
    -name "ecosystem.config.mjs" -o \
    -name ".env" -o \
    -name ".env.production" \
  \) 2>/dev/null | head -300
done
'

# Copy sanitized env/ecosystem/package hints only from common app paths
while IFS= read -r f; do
  sanitize_copy "$f"
done < <(
  find /root /opt /srv /var/www /home -maxdepth 5 -type f \( \
    -name "package.json" -o \
    -name "ecosystem.config.js" -o \
    -name "ecosystem.config.cjs" -o \
    -name "ecosystem.config.mjs" -o \
    -name ".env" -o \
    -name ".env.production" -o \
    -name ".env.local" \
  \) 2>/dev/null | head -200
)

# =========================================================
# 9. PostgreSQL
# =========================================================
section "PostgreSQL binaries" bash -lc 'psql --version 2>/dev/null || true; pg_lsclusters 2>/dev/null || true'
section "PostgreSQL processes" bash -lc 'ps aux | grep -i "[p]ostgres" || true'
section "PostgreSQL ports" bash -lc 'ss -lntp | grep -E ":5432|:5433|postgres" || true'

for f in \
  /etc/postgresql/*/main/postgresql.conf \
  /etc/postgresql/*/main/pg_hba.conf \
  /etc/postgresql/*/main/pg_ident.conf
do
  [[ -f "$f" ]] && sanitize_copy "$f"
done

section "PostgreSQL data directories" bash -lc '
pg_lsclusters 2>/dev/null || true
for d in /var/lib/postgresql/*/main; do
  [[ -d "$d" ]] && echo "$d" && du -sh "$d" 2>/dev/null || true
done
'

# Safe local postgres probes, only if peer/local access works
section "PostgreSQL local HA info" bash -lc '
if command -v sudo >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
  sudo -u postgres psql -Atqc "select version();" 2>/dev/null || true
  echo "is_in_recovery:"
  sudo -u postgres psql -Atqc "select pg_is_in_recovery();" 2>/dev/null || true
  echo "databases:"
  sudo -u postgres psql -Atqc "select datname from pg_database where datistemplate=false order by datname;" 2>/dev/null || true
  echo "replication slots:"
  sudo -u postgres psql -Atqc "select slot_name, slot_type, active from pg_replication_slots;" 2>/dev/null || true
  echo "replication status:"
  sudo -u postgres psql -Atqc "select application_name, client_addr, state, sync_state from pg_stat_replication;" 2>/dev/null || true
fi
'

# =========================================================
# 10. Redis / NATS / RabbitMQ / Keycloak hints
# =========================================================
section "Redis status" bash -lc 'redis-server --version 2>/dev/null || true; redis-cli INFO server 2>/dev/null | head -40 || true; ss -lntp | grep -E ":6379|redis" || true'
for f in /etc/redis/redis.conf /etc/redis.conf; do
  [[ -f "$f" ]] && sanitize_copy "$f"
done

section "NATS hints" bash -lc 'nats-server -v 2>/dev/null || true; ss -lntp | grep -E ":4222|:8222|nats" || true; ps aux | grep -i "[n]ats" || true'
section "RabbitMQ hints" bash -lc 'rabbitmqctl status 2>/dev/null | head -120 || true; ss -lntp | grep -E ":5672|:15672|rabbit" || true'
section "Keycloak hints" bash -lc 'ps aux | grep -i "[k]eycloak" || true; ss -lntp | grep -E ":8080|:8443|keycloak" || true'

# =========================================================
# 11. TLS certificates
# =========================================================
section "TLS certificate locations" bash -lc '
find /etc/letsencrypt /etc/ssl /etc/nginx /opt /srv /var/www -maxdepth 5 -type f \( \
  -name "*.crt" -o -name "*.pem" -o -name "fullchain.pem" -o -name "cert.pem" \
\) 2>/dev/null | head -200
'
section "Certbot status" bash -lc 'certbot certificates 2>/dev/null || true; systemctl list-timers --no-pager | grep -i certbot || true'

# =========================================================
# 12. Cron / scheduled jobs
# =========================================================
section "Cron jobs" bash -lc '
echo "### /etc/crontab"; cat /etc/crontab 2>/dev/null || true
echo "### /etc/cron.d"; ls -la /etc/cron.d 2>/dev/null || true
echo "### user crontab"; crontab -l 2>/dev/null || true
echo "### root crontab"; sudo crontab -l 2>/dev/null || true
'
section "Systemd timers" bash -lc 'systemctl list-timers --all --no-pager 2>/dev/null || true'

# =========================================================
# 13. Logs summary
# =========================================================
section "Recent critical journal logs" bash -lc 'journalctl -p warning..alert -n 300 --no-pager 2>/dev/null || true'
section "Recent nginx errors" bash -lc 'tail -n 200 /var/log/nginx/error.log 2>/dev/null || true'
section "Recent syslog" bash -lc 'tail -n 200 /var/log/syslog 2>/dev/null || tail -n 200 /var/log/messages 2>/dev/null || true'

# =========================================================
# 14. Environment variable names only
# =========================================================
section "Environment variable names only" bash -lc 'printenv | cut -d= -f1 | sort -u'

# =========================================================
# 15. Manual questionnaire
# =========================================================
cat > "${ROOT}/01_OPERATOR_QUESTIONS.md" <<'EOF'
# Manual HA Questions

Fill these manually because the VM cannot reliably detect them.

## Traffic / DNS
- Public domain:
- Current DNS provider:
- Current DNS points to:
- Intended load balancer DNS / VIP:
- TLS termination: LB or VM?
- Health check path to use:
- Expected health check HTTP status:

## Cloud / provider
- Provider: AWS / Azure / GCP / Hetzner / DigitalOcean / on-prem / other:
- Region:
- Availability zone of this VM:
- Should the second VM be in another AZ?
- Is private networking enabled between VMs?

## Application
- Which services must run on both VMs?
- Which services must run only once?
- Any background schedulers / cron jobs that must NOT duplicate?
- Does the app store uploaded files locally?
- Does the app use WebSockets or SSE?
- Does the app require sticky sessions?

## Database
- Is PostgreSQL currently on this same VM?
- Is PostgreSQL allowed to move to dedicated DB VMs?
- Desired HA model: Patroni / managed DB / streaming replica / other:
- Approved downtime window:
- Backup location:
- Restore test done? yes/no:

## Cache / queues
- Redis used for cache, sessions, queues, or locks?
- NATS / RabbitMQ / Kafka used?
- Any queue consumers that must avoid duplicate execution?

## Deployment
- Current deployment method:
- Git branch / release tag:
- Rollback method:
- Who approves failover?
EOF

# =========================================================
# 16. Final archive
# =========================================================
tar -czf "${OUT_DIR}.tar.gz" "$OUT_DIR"

echo
echo "DONE"
echo "Report folder: ${ROOT}"
echo "Archive: $(readlink -f "${OUT_DIR}.tar.gz" 2>/dev/null || echo "${OUT_DIR}.tar.gz")"
echo
echo "Send back this file:"
echo "  ${OUT_DIR}.tar.gz"
echo
echo "Important: review sanitized files before sending. Secrets are redacted best-effort, not guaranteed."
