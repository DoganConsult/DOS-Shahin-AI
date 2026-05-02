#!/usr/bin/env bash
# DOS Platform — enterprise-grade native daemon bootstrap.
#
# What this installs:
#   - HashiCorp Vault    → /usr/local/bin/vault   :8200 / :8201
#   - OpenFeature flagd  → /usr/local/bin/flagd   :8013 / :8014 / :8016
#   - GlitchTip          → /opt/glitchtip         :8000          (optional, --with-glitchtip)
#
# Mirrors the existing native-daemon pattern used by cerbos.service /
# openfga.service / keycloak. No Docker, no cloud. Single-server.
#
# Usage:
#   sudo bash ops/bootstrap/install-prod-grade.sh                 # vault + flagd
#   sudo bash ops/bootstrap/install-prod-grade.sh --with-glitchtip
#   sudo bash ops/bootstrap/install-prod-grade.sh --dry-run       # show steps, change nothing
#
# Idempotent — re-runnable. Each step checks before doing.

set -euo pipefail

# ---------- args ----------
WITH_GLITCHTIP=0
DRY_RUN=0
SKIP_VAULT_INIT=0
for a in "$@"; do
  case "$a" in
    --with-glitchtip) WITH_GLITCHTIP=1 ;;
    --dry-run)        DRY_RUN=1 ;;
    --skip-vault-init) SKIP_VAULT_INIT=1 ;;
    -h|--help)
      sed -n '1,/^set -euo/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unknown arg: $a" >&2; exit 2 ;;
  esac
done

# ---------- versions / sources ----------
VAULT_VER="${VAULT_VER:-1.18.5}"
FLAGD_VER="${FLAGD_VER:-0.13.0}"

VAULT_URL="https://releases.hashicorp.com/vault/${VAULT_VER}/vault_${VAULT_VER}_linux_amd64.zip"
VAULT_SHA_URL="https://releases.hashicorp.com/vault/${VAULT_VER}/vault_${VAULT_VER}_SHA256SUMS"
FLAGD_URL="https://github.com/open-feature/flagd/releases/download/flagd/v${FLAGD_VER}/flagd_${FLAGD_VER}_Linux_x86_64.tar.gz"

# ---------- helpers ----------
log()  { printf '\033[0;36m[bootstrap]\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m[ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[warn]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[0;31m[err]\033[0m %s\n' "$*" >&2; exit 1; }
run()  { if [[ "$DRY_RUN" -eq 1 ]]; then echo "+ $*"; else eval "$@"; fi; }

require_root() {
  [[ "$EUID" -eq 0 ]] || err "must run as root (sudo)"
}

systemd_exists() {
  systemctl list-unit-files "${1}.service" --no-pager 2>/dev/null | grep -q "^${1}\.service"
}

# ---------- pre-flight ----------
preflight() {
  log "pre-flight checks"
  require_root
  command -v systemctl >/dev/null || err "systemd required"
  command -v curl      >/dev/null || err "curl required"
  command -v unzip     >/dev/null || err "unzip required"
  command -v useradd   >/dev/null || err "useradd required"
  command -v setcap    >/dev/null || err "setcap (libcap2-bin) required"
  systemctl is-active --quiet postgresql   || warn "postgresql not active — GlitchTip needs it"
  systemctl is-active --quiet redis-server || warn "redis-server not active — GlitchTip needs it"
  for port in 8200 8201 8013 8014 8016 8000; do
    if ss -tln 2>/dev/null | awk '{print $4}' | grep -q ":${port}\$"; then
      warn "port :${port} is already in use — service install may fail"
    fi
  done
  ok "pre-flight ok"
}

# ---------- VAULT ----------
install_vault() {
  log "installing HashiCorp Vault ${VAULT_VER}"

  local tmpdir
  tmpdir="$(mktemp -d)"
  trap "rm -rf '$tmpdir'" RETURN

  if [[ ! -x /usr/local/bin/vault ]] || ! /usr/local/bin/vault --version 2>/dev/null | grep -q "v${VAULT_VER}"; then
    log "downloading $(basename "$VAULT_URL")"
    run curl -fsSLo "$tmpdir/vault.zip"  "$VAULT_URL"
    run curl -fsSLo "$tmpdir/SHA256SUMS" "$VAULT_SHA_URL"
    if [[ "$DRY_RUN" -eq 0 ]]; then
      ( cd "$tmpdir" \
        && cp vault.zip "vault_${VAULT_VER}_linux_amd64.zip" \
        && grep "linux_amd64.zip" SHA256SUMS | sha256sum -c - >/dev/null )
    fi
    run unzip -o "$tmpdir/vault.zip" -d "$tmpdir/" >/dev/null
    run install -m 0755 "$tmpdir/vault" /usr/local/bin/vault
    run setcap cap_ipc_lock=+ep /usr/local/bin/vault
    ok "vault binary installed"
  else
    ok "vault binary already at v${VAULT_VER}"
  fi

  id vault &>/dev/null || run useradd --system --home /etc/vault --shell /usr/sbin/nologin vault
  run mkdir -p /etc/vault /data/vault /var/log/vault
  run chown -R vault:vault /etc/vault /data/vault /var/log/vault
  run chmod 0700 /data/vault /etc/vault

  if [[ "$DRY_RUN" -eq 0 ]]; then
    cat > /etc/vault/vault.hcl <<'HCL'
# DOS Platform — Vault native config (single-server, no docker)
ui = true
disable_mlock = false

storage "file" {
  path = "/data/vault"
}

listener "tcp" {
  address     = "127.0.0.1:8200"
  cluster_address = "127.0.0.1:8201"
  tls_disable = 1     # behind nginx/local — no remote exposure
}

api_addr     = "http://127.0.0.1:8200"
cluster_addr = "https://127.0.0.1:8201"
log_level    = "info"
HCL
    chown vault:vault /etc/vault/vault.hcl
    chmod 0640        /etc/vault/vault.hcl

    cat > /etc/systemd/system/vault.service <<'UNIT'
[Unit]
Description=HashiCorp Vault (DOS Platform — secrets/KV+transit)
Documentation=https://developer.hashicorp.com/vault
Requires=network-online.target
After=network-online.target
ConditionFileNotEmpty=/etc/vault/vault.hcl

[Service]
Type=notify
User=vault
Group=vault
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes
PrivateDevices=yes
SecureBits=keep-caps
AmbientCapabilities=CAP_IPC_LOCK
CapabilityBoundingSet=CAP_SYSLOG CAP_IPC_LOCK
NoNewPrivileges=yes
ExecStart=/usr/local/bin/vault server -config=/etc/vault/vault.hcl
ExecReload=/bin/kill --signal HUP $MAINPID
KillMode=process
KillSignal=SIGINT
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
UNIT
  fi

  run systemctl daemon-reload
  run systemctl enable vault.service
  run systemctl restart vault.service
  ok "vault.service started on :8200"
}

init_vault() {
  [[ "$SKIP_VAULT_INIT" -eq 1 ]] && { log "skipping vault init/unseal"; return; }
  export VAULT_ADDR="http://127.0.0.1:8200"
  sleep 2

  if vault status -format=json 2>/dev/null | grep -q '"initialized": true'; then
    if vault status -format=json 2>/dev/null | grep -q '"sealed": true'; then
      warn "vault already initialized but sealed — unseal manually with:"
      warn "  VAULT_ADDR=http://127.0.0.1:8200 vault operator unseal <key>"
    else
      ok "vault already initialized + unsealed"
    fi
    return
  fi

  log "initializing vault (1 key share, threshold 1 — single-server dev/staging mode)"
  if [[ "$DRY_RUN" -eq 1 ]]; then return; fi
  local init_out
  init_out="$(vault operator init -key-shares=1 -key-threshold=1 -format=json)"
  install -m 0600 -o root -g root /dev/null /root/.vault-keys
  echo "$init_out" > /root/.vault-keys
  chmod 0600 /root/.vault-keys
  local key root_token
  key=$(echo "$init_out" | python3 -c 'import sys,json;print(json.load(sys.stdin)["unseal_keys_b64"][0])')
  root_token=$(echo "$init_out" | python3 -c 'import sys,json;print(json.load(sys.stdin)["root_token"])')
  vault operator unseal "$key" >/dev/null
  echo "VAULT_TOKEN=$root_token" > /root/.vault-token
  chmod 0600 /root/.vault-token
  ok "vault unsealed; root token + unseal key in /root/.vault-keys (chmod 600)"

  log "enabling kv-v2 secrets engine at /secret"
  VAULT_TOKEN="$root_token" vault secrets enable -path=secret kv-v2 2>/dev/null || true
  VAULT_TOKEN="$root_token" vault secrets enable transit 2>/dev/null || true
  ok "kv-v2 + transit engines enabled"
}

# ---------- FLAGD ----------
install_flagd() {
  log "installing OpenFeature flagd ${FLAGD_VER}"

  local tmpdir
  tmpdir="$(mktemp -d)"
  trap "rm -rf '$tmpdir'" RETURN

  if [[ ! -x /usr/local/bin/flagd ]] || ! /usr/local/bin/flagd --version 2>/dev/null | grep -qE "(v|version )${FLAGD_VER}"; then
    log "downloading $(basename "$FLAGD_URL")"
    run curl -fsSLo "$tmpdir/flagd.tar.gz" "$FLAGD_URL"
    run tar xzf "$tmpdir/flagd.tar.gz" -C "$tmpdir"
    run install -m 0755 "$tmpdir/flagd_linux_x86_64" /usr/local/bin/flagd
    ok "flagd binary installed"
  else
    ok "flagd binary already at v${FLAGD_VER}"
  fi

  id flagd &>/dev/null || run useradd --system --home /etc/flagd --shell /usr/sbin/nologin flagd
  run mkdir -p /etc/flagd /var/log/flagd
  run chown -R flagd:flagd /etc/flagd /var/log/flagd

  if [[ "$DRY_RUN" -eq 0 && ! -f /etc/flagd/flags.json ]]; then
    cat > /etc/flagd/flags.json <<'JSON'
{
  "$schema": "https://flagd.dev/schema/v0/flags.json",
  "flags": {
    "dynamic-ui-strict":         { "state": "ENABLED", "variants": { "on": true,  "off": false }, "defaultVariant": "off" },
    "ai-os-kill-switch":         { "state": "ENABLED", "variants": { "on": true,  "off": false }, "defaultVariant": "off" },
    "keycloak-enforce":          { "state": "ENABLED", "variants": { "shadow": "shadow", "enforce": "enforce" }, "defaultVariant": "shadow" },
    "outbox-dispatcher-enabled": { "state": "ENABLED", "variants": { "on": true,  "off": false }, "defaultVariant": "on" },
    "openrouter-circuit-breaker":{ "state": "ENABLED", "variants": { "on": true,  "off": false }, "defaultVariant": "on" }
  }
}
JSON
    chown flagd:flagd /etc/flagd/flags.json
    chmod 0644 /etc/flagd/flags.json
  fi

  if [[ "$DRY_RUN" -eq 0 ]]; then
    cat > /etc/systemd/system/flagd.service <<'UNIT'
[Unit]
Description=OpenFeature flagd (DOS Platform — feature flags)
Documentation=https://flagd.dev
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=flagd
Group=flagd
ExecStart=/usr/local/bin/flagd start \
  --uri file:/etc/flagd/flags.json \
  --port 8013 \
  --metrics-port 8014 \
  --ofrep-port 8016 \
  --log-format json
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/log/flagd
MemoryMax=256M

[Install]
WantedBy=multi-user.target
UNIT
  fi

  run systemctl daemon-reload
  run systemctl enable flagd.service
  run systemctl restart flagd.service
  ok "flagd.service started on :8013 (gRPC) :8014 (metrics) :8016 (OFREP)"
}

# ---------- GLITCHTIP ----------
install_glitchtip() {
  log "installing GlitchTip (Sentry-protocol error telemetry)"

  command -v python3 >/dev/null || err "python3 required"
  command -v psql    >/dev/null || err "psql required"
  command -v git     >/dev/null || err "git required"

  id glitchtip &>/dev/null || run useradd --system --home /opt/glitchtip --shell /bin/bash glitchtip
  run mkdir -p /opt/glitchtip /var/log/glitchtip
  run chown -R glitchtip:glitchtip /opt/glitchtip /var/log/glitchtip

  if [[ ! -d /opt/glitchtip/.git ]]; then
    log "cloning GlitchTip backend"
    run sudo -u glitchtip git clone --depth=1 --branch=v4.2 https://gitlab.com/glitchtip/glitchtip-backend.git /opt/glitchtip/repo
  else
    ok "GlitchTip repo present"
  fi

  if [[ ! -d /opt/glitchtip/venv ]]; then
    log "creating venv + installing requirements (~5 min)"
    run sudo -u glitchtip python3 -m venv /opt/glitchtip/venv
    run sudo -u glitchtip /opt/glitchtip/venv/bin/pip install -U pip
    run sudo -u glitchtip /opt/glitchtip/venv/bin/pip install -r /opt/glitchtip/repo/requirements.txt
  fi

  # Postgres role + DB
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='glitchtip'" | grep -q 1; then
    local pw
    pw="$(openssl rand -hex 24)"
    run sudo -u postgres psql -c "CREATE ROLE glitchtip LOGIN PASSWORD '${pw}';"
    run sudo -u postgres createdb -O glitchtip glitchtip
    install -m 0600 -o glitchtip -g glitchtip /dev/null /opt/glitchtip/.env
    cat > /opt/glitchtip/.env <<ENV
DATABASE_URL=postgres://glitchtip:${pw}@127.0.0.1:5432/glitchtip
SECRET_KEY=$(openssl rand -hex 48)
PORT=8000
EMAIL_URL=consolemail://
GLITCHTIP_DOMAIN=http://127.0.0.1:8000
DEFAULT_FROM_EMAIL=glitchtip@127.0.0.1
CELERY_WORKER_AUTOSCALE=1,3
REDIS_URL=redis://:\${REDIS_PASSWORD}@127.0.0.1:6379/4
ENV
    chown glitchtip:glitchtip /opt/glitchtip/.env
    chmod 0600 /opt/glitchtip/.env
    ok "glitchtip postgres role + db + .env created"
  fi

  log "running django migrations"
  run sudo -u glitchtip bash -c 'cd /opt/glitchtip/repo && set -a && source /opt/glitchtip/.env && /opt/glitchtip/venv/bin/python manage.py migrate'

  if [[ "$DRY_RUN" -eq 0 ]]; then
    cat > /etc/systemd/system/glitchtip-web.service <<'UNIT'
[Unit]
Description=GlitchTip web (DOS Platform — Sentry-compat error telemetry)
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=glitchtip
Group=glitchtip
WorkingDirectory=/opt/glitchtip/repo
EnvironmentFile=/opt/glitchtip/.env
ExecStart=/opt/glitchtip/venv/bin/uvicorn glitchtip.asgi:application --host 127.0.0.1 --port 8000 --workers 2
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/opt/glitchtip /var/log/glitchtip
PrivateTmp=true
MemoryMax=1G

[Install]
WantedBy=multi-user.target
UNIT

    cat > /etc/systemd/system/glitchtip-worker.service <<'UNIT'
[Unit]
Description=GlitchTip celery worker (DOS Platform)
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=glitchtip
Group=glitchtip
WorkingDirectory=/opt/glitchtip/repo
EnvironmentFile=/opt/glitchtip/.env
ExecStart=/opt/glitchtip/venv/bin/celery -A glitchtip worker --loglevel=info
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/opt/glitchtip /var/log/glitchtip
PrivateTmp=true
MemoryMax=1G

[Install]
WantedBy=multi-user.target
UNIT
  fi

  run systemctl daemon-reload
  run systemctl enable glitchtip-web.service glitchtip-worker.service
  run systemctl restart glitchtip-web.service glitchtip-worker.service
  ok "glitchtip-web.service + glitchtip-worker.service started on :8000"
  warn "create the first admin user with:"
  warn "  sudo -u glitchtip bash -c 'cd /opt/glitchtip/repo && source /opt/glitchtip/.env && /opt/glitchtip/venv/bin/python manage.py createsuperuser'"
}

# ---------- HEALTH CHECKS ----------
health() {
  log "post-install health checks"
  sleep 2
  local fail=0
  if curl -fsS http://127.0.0.1:8200/v1/sys/seal-status >/dev/null 2>&1; then
    ok "vault    :8200 healthy"
  else
    warn "vault    :8200 NOT healthy"; fail=1
  fi
  if curl -fsS http://127.0.0.1:8014/metrics >/dev/null 2>&1; then
    ok "flagd    :8014 metrics healthy"
  else
    warn "flagd    :8014 NOT healthy"; fail=1
  fi
  if [[ "$WITH_GLITCHTIP" -eq 1 ]]; then
    if curl -fsS http://127.0.0.1:8000/_health/ >/dev/null 2>&1; then
      ok "glitchtip :8000 healthy"
    else
      warn "glitchtip :8000 NOT healthy (worker may still be migrating)"; fail=1
    fi
  fi
  return $fail
}

# ---------- main ----------
main() {
  preflight
  install_vault
  init_vault
  install_flagd
  if [[ "$WITH_GLITCHTIP" -eq 1 ]]; then
    install_glitchtip
  else
    log "skipping glitchtip (use --with-glitchtip to install)"
  fi
  health
  log "done. tracked in ops/ports.allocation.json (external block)."
}

main "$@"
