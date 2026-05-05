#!/usr/bin/env bash
# DOS Platform — Temporal server native install (no Docker).
#
# Installs temporal-server from official GitHub release tarball, creates Postgres
# databases + visibility DB, runs temporal-sql-tool setup-schema for BOTH stores
# with schema version 12.0 (postgresql/v12/temporal + postgresql/v12/visibility),
# and registers systemd unit temporal-server.service listening on 127.0.0.1:7233.
#
# Mirrors ecosystem expectation in ports.allocation.json → external.temporal :7233.
# Namespace ai-os + 72h retention: run temporal CLI after first start (see footer).
#
# Usage:
#   sudo TEMPORAL_DB_PASSWORD='secret' bash ops/bootstrap/install-temporal-native.sh
#   sudo bash ops/bootstrap/install-temporal-native.sh --dry-run
#   sudo bash ops/bootstrap/install-temporal-native.sh --skip-postgres-bootstrap   # DBs/user already exist
#   sudo bash ops/bootstrap/install-temporal-native.sh --stop-conflicting          # kill manual temporal on :7233 so systemd can bind
#   sudo bash ops/bootstrap/install-temporal-native.sh --generate-secrets          # openssl TEMPORAL_DB_PASSWORD → /etc/temporal/temporal.env (chmod 600)
#   sudo bash ops/bootstrap/install-temporal-native.sh --generate-secrets --force-regenerate-secrets
#
# Env (optional):
#   TEMPORAL_VER=1.25.2
#   POSTGRES_HOST=127.0.0.1   POSTGRES_PORT=5432  POSTGRES_SUPERUSER=postgres
#   TEMPORAL_DB_USER=temporal TEMPORAL_DB_PASSWORD=...
#   TEMPORAL_DB=temporal      TEMPORAL_VISIBILITY_DB=temporal_visibility
#   TEMPORAL_SCHEMA_VERSION=12.0   (passed to temporal-sql-tool setup-schema -v)
#   TEMPORAL_CLI_VER=1.1.0         (temporalio/cli — optional install to /usr/local/bin/temporal)
#
# Idempotent — safe to re-run.

set -euo pipefail

DRY_RUN=0
SKIP_PG_BOOTSTRAP=0
WITH_CLI=1
STOP_CONFLICTING=0
GENERATE_SECRETS=0
FORCE_REGEN_SECRETS=0
TEMPORAL_ENV_FILE="${TEMPORAL_ENV_FILE:-/etc/temporal/temporal.env}"

for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    --skip-postgres-bootstrap) SKIP_PG_BOOTSTRAP=1 ;;
    --without-cli) WITH_CLI=0 ;;
    --stop-conflicting) STOP_CONFLICTING=1 ;;
    --generate-secrets) GENERATE_SECRETS=1 ;;
    --force-regenerate-secrets) FORCE_REGEN_SECRETS=1 ;;
    -h|--help)
      sed -n '1,/^set -euo/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unknown arg: $a" >&2; exit 2 ;;
  esac
done

TEMPORAL_VER="${TEMPORAL_VER:-1.25.2}"
TEMPORAL_SCHEMA_VERSION="${TEMPORAL_SCHEMA_VERSION:-12.0}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_SUPERUSER="${POSTGRES_SUPERUSER:-postgres}"
TEMPORAL_DB_USER="${TEMPORAL_DB_USER:-temporal}"
TEMPORAL_DB="${TEMPORAL_DB:-temporal}"
TEMPORAL_VISIBILITY_DB="${TEMPORAL_VISIBILITY_DB:-temporal_visibility}"
TEMPORAL_CLI_VER="${TEMPORAL_CLI_VER:-1.1.0}"

INSTALL_ROOT="/opt/temporal/${TEMPORAL_VER}"
CURRENT_LINK="/opt/temporal/current"
TARBALL_URL="https://github.com/temporalio/temporal/releases/download/v${TEMPORAL_VER}/temporal_${TEMPORAL_VER}_linux_amd64.tar.gz"
CLI_URL="https://github.com/temporalio/cli/releases/download/v${TEMPORAL_CLI_VER}/temporal_cli_${TEMPORAL_CLI_VER}_linux_amd64.tar.gz"

log()  { printf '\033[0;36m[temporal]\033[0m %s\n' "$*"; }
ok()   { printf '\033[0;32m[ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[warn]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[0;31m[err]\033[0m %s\n' "$*" >&2; exit 1; }

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '+ %q ' "$@"; echo
  else
    "$@"
  fi
}

require_root() { [[ "${EUID:-0}" -eq 0 ]] || err "must run as root (sudo)"; }

load_temporal_env_file() {
  [[ -f "$TEMPORAL_ENV_FILE" ]] || return 0
  # shellcheck disable=SC1090
  set -a
  source "$TEMPORAL_ENV_FILE"
  set +a
}

generate_temporal_secrets_if_requested() {
  [[ "$FORCE_REGEN_SECRETS" -eq 1 && "$GENERATE_SECRETS" -eq 0 ]] && \
    err "--force-regenerate-secrets requires --generate-secrets"
  [[ "$GENERATE_SECRETS" -eq 1 ]] || return 0
  command -v openssl >/dev/null || err "openssl required for --generate-secrets"
  local need_write=0
  if [[ "$FORCE_REGEN_SECRETS" -eq 1 ]]; then
    need_write=1
  elif [[ -z "${TEMPORAL_DB_PASSWORD:-}" ]]; then
    need_write=1
  fi
  if [[ "$need_write" -eq 0 ]]; then
    ok "TEMPORAL_DB_PASSWORD already set — skip generation (use --force-regenerate-secrets)"
    return 0
  fi
  local pw
  pw="$(openssl rand -hex 24)"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: would write TEMPORAL_DB_PASSWORD to ${TEMPORAL_ENV_FILE}"
    TEMPORAL_DB_PASSWORD="$pw"
    export TEMPORAL_DB_PASSWORD
    return 0
  fi
  require_root
  umask 077
  run mkdir -p "$(dirname "$TEMPORAL_ENV_FILE")"
  printf 'TEMPORAL_DB_PASSWORD=%s\n' "$pw" >"$TEMPORAL_ENV_FILE"
  run chmod 600 "$TEMPORAL_ENV_FILE"
  warn "generated TEMPORAL_DB_PASSWORD — backup ${TEMPORAL_ENV_FILE}; rotate in production"
  TEMPORAL_DB_PASSWORD="$pw"
  export TEMPORAL_DB_PASSWORD
}

preflight() {
  require_root
  command -v curl >/dev/null || err "curl required"
  command -v tar >/dev/null || err "tar required"
  command -v systemctl >/dev/null || err "systemd required"
  command -v python3 >/dev/null || err "python3 required (for safe YAML password patching)"
  if [[ -z "${TEMPORAL_DB_PASSWORD:-}" ]]; then
    err "TEMPORAL_DB_PASSWORD is required (set env before running)"
  fi
  ok "pre-flight ok"
}

ensure_user() {
  if id temporal &>/dev/null; then
    ok "user temporal exists"
  else
    run useradd --system --home-dir /opt/temporal --shell /usr/sbin/nologin temporal
    ok "created user temporal"
  fi
}

download_extract() {
  if [[ -x "${INSTALL_ROOT}/temporal-server" ]]; then
    ok "temporal-server ${TEMPORAL_VER} already at ${INSTALL_ROOT}"
  else
    local tmp
    tmp="$(mktemp)"
    log "download ${TARBALL_URL}"
    run curl -fsSL -o "$tmp" "$TARBALL_URL"
    run mkdir -p "${INSTALL_ROOT}"
    run tar -xzf "$tmp" -C "${INSTALL_ROOT}"
    run rm -f "$tmp"
    run chown -R temporal:temporal /opt/temporal
    ok "extracted temporal ${TEMPORAL_VER}"
  fi
  run rm -f "${CURRENT_LINK}"
  run ln -sfn "${INSTALL_ROOT}" "${CURRENT_LINK}"
  ok "symlink ${CURRENT_LINK} -> ${INSTALL_ROOT}"
}

# Prefer local peer auth via postgres OS user when available.
pg_super_exec() {
  local sql="$1"
  if command -v psql &>/dev/null && sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT 1" &>/dev/null; then
    run sudo -u postgres psql -v ON_ERROR_STOP=1 -c "$sql"
  else
    export PGPASSWORD="${POSTGRES_SUPERUSER_PASSWORD:-}"
    run psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_SUPERUSER" -v ON_ERROR_STOP=1 -c "$sql"
  fi
}

pg_super_exists_db() {
  local db="$1"
  local q="SELECT 1 FROM pg_database WHERE datname = '${db//\'/\'\'}'"
  if command -v psql &>/dev/null && sudo -u postgres psql -v ON_ERROR_STOP=1 -c "SELECT 1" &>/dev/null; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc "$q" | grep -q 1
  else
    export PGPASSWORD="${POSTGRES_SUPERUSER_PASSWORD:-}"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_SUPERUSER" -v ON_ERROR_STOP=1 -tAc "$q" | grep -q 1
  fi
}

bootstrap_postgres() {
  [[ "$SKIP_PG_BOOTSTRAP" -eq 1 ]] && { warn "skip postgres bootstrap"; return 0; }
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: skip Postgres bootstrap (would create role + DBs)"
    return 0
  fi

  local pw_esc="${TEMPORAL_DB_PASSWORD//\'/\'\'}"
  local role_sql
  role_sql="DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${TEMPORAL_DB_USER}') THEN
    CREATE ROLE \"${TEMPORAL_DB_USER}\" LOGIN PASSWORD '${pw_esc}';
  ELSE
    ALTER ROLE \"${TEMPORAL_DB_USER}\" WITH PASSWORD '${pw_esc}';
  END IF;
END \$\$;"

  log "bootstrap Postgres role ${TEMPORAL_DB_USER}"
  pg_super_exec "$role_sql"

  if ! pg_super_exists_db "$TEMPORAL_DB"; then
    log "CREATE DATABASE ${TEMPORAL_DB}"
    pg_super_exec "CREATE DATABASE \"${TEMPORAL_DB}\" OWNER \"${TEMPORAL_DB_USER}\";"
  else
    ok "database ${TEMPORAL_DB} already exists"
  fi

  if ! pg_super_exists_db "$TEMPORAL_VISIBILITY_DB"; then
    log "CREATE DATABASE ${TEMPORAL_VISIBILITY_DB}"
    pg_super_exec "CREATE DATABASE \"${TEMPORAL_VISIBILITY_DB}\" OWNER \"${TEMPORAL_DB_USER}\";"
  else
    ok "database ${TEMPORAL_VISIBILITY_DB} already exists"
  fi

  pg_super_exec "GRANT ALL PRIVILEGES ON DATABASE \"${TEMPORAL_DB}\" TO \"${TEMPORAL_DB_USER}\";"
  pg_super_exec "GRANT ALL PRIVILEGES ON DATABASE \"${TEMPORAL_VISIBILITY_DB}\" TO \"${TEMPORAL_DB_USER}\";"

  ok "postgres role + databases ready"
}

setup_schema() {
  local tool="${INSTALL_ROOT}/temporal-sql-tool"
  [[ -x "$tool" ]] || err "missing ${tool}"

  log "schema temporal (postgresql/v12/temporal) version ${TEMPORAL_SCHEMA_VERSION}"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "+ sudo -u temporal env SQL_* ${tool} setup-schema -v ${TEMPORAL_SCHEMA_VERSION} --schema-name postgresql/v12/temporal"
  else
    sudo -u temporal env \
      SQL_PLUGIN=postgres12 SQL_HOST="$POSTGRES_HOST" SQL_PORT="$POSTGRES_PORT" \
      SQL_DATABASE="$TEMPORAL_DB" SQL_USER="$TEMPORAL_DB_USER" SQL_PASSWORD="$TEMPORAL_DB_PASSWORD" \
      "$tool" setup-schema -v "$TEMPORAL_SCHEMA_VERSION" --schema-name postgresql/v12/temporal
  fi

  log "schema visibility (postgresql/v12/visibility) version ${TEMPORAL_SCHEMA_VERSION}"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "+ sudo -u temporal env SQL_* ${tool} setup-schema -v ${TEMPORAL_SCHEMA_VERSION} --schema-name postgresql/v12/visibility"
  else
    sudo -u temporal env \
      SQL_PLUGIN=postgres12 SQL_HOST="$POSTGRES_HOST" SQL_PORT="$POSTGRES_PORT" \
      SQL_DATABASE="$TEMPORAL_VISIBILITY_DB" SQL_USER="$TEMPORAL_DB_USER" SQL_PASSWORD="$TEMPORAL_DB_PASSWORD" \
      "$tool" setup-schema -v "$TEMPORAL_SCHEMA_VERSION" --schema-name postgresql/v12/visibility
  fi

  ok "temporal-sql-tool setup-schema completed (idempotent)"
}

# Patch development.yaml copied from development-postgres12.yaml:
# keys under persistence.datastores postgres-default / postgres-visibility (sql.*).
patch_development_yaml() {
  local path="$1"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: patch ${path} (python)"
    return 0
  fi
  TEMPORAL_PATCH_CFG="$path" \
  TEMPORAL_PATCH_DB="$TEMPORAL_DB" \
  TEMPORAL_PATCH_VIS="$TEMPORAL_VISIBILITY_DB" \
  TEMPORAL_PATCH_USER="$TEMPORAL_DB_USER" \
  TEMPORAL_PATCH_PW="$TEMPORAL_DB_PASSWORD" \
  TEMPORAL_PATCH_HOST="$POSTGRES_HOST" \
  TEMPORAL_PATCH_PORT="$POSTGRES_PORT" \
  python3 - <<'PY'
import os
from pathlib import Path

def esc_yaml_double(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')

path = Path(os.environ["TEMPORAL_PATCH_CFG"])
text = path.read_text(encoding="utf-8")
db = os.environ["TEMPORAL_PATCH_DB"]
vis = os.environ["TEMPORAL_PATCH_VIS"]
user = os.environ["TEMPORAL_PATCH_USER"]
pw = esc_yaml_double(os.environ["TEMPORAL_PATCH_PW"])
host = os.environ["TEMPORAL_PATCH_HOST"]
port = os.environ["TEMPORAL_PATCH_PORT"]
addr = f"{host}:{port}"

replacements = [
    ('databaseName: "temporal"', f'databaseName: "{db}"', 1),
    ('databaseName: "temporal_visibility"', f'databaseName: "{vis}"', 1),
    ('user: "temporal"', f'user: "{user}"', 0),
    ('password: "temporal"', f'password: "{pw}"', 0),
    ('connectAddr: "127.0.0.1:5432"', f'connectAddr: "{addr}"', 0),
]
for old, new, lim in replacements:
    if old not in text:
        raise SystemExit(f"patch_development_yaml: expected snippet not found: {old!r}")
    if lim == 1:
        text = text.replace(old, new, 1)
    else:
        text = text.replace(old, new)

path.write_text(text, encoding="utf-8")
PY
}

write_config() {
  local cfg_dir="${INSTALL_ROOT}/config"
  run mkdir -p "$cfg_dir/dynamicconfig"
  if [[ -f "${INSTALL_ROOT}/config/development-postgres12.yaml" ]]; then
    run cp -f "${INSTALL_ROOT}/config/development-postgres12.yaml" "${cfg_dir}/development.yaml"
  else
    err "missing bundled development-postgres12.yaml — corrupt tarball?"
  fi
  if [[ -f "${INSTALL_ROOT}/config/dynamicconfig/development-sql.yaml" ]]; then
    run cp -f "${INSTALL_ROOT}/config/dynamicconfig/development-sql.yaml" "${cfg_dir}/dynamicconfig/development-sql.yaml"
  fi

  patch_development_yaml "${cfg_dir}/development.yaml"

  run chown -R temporal:temporal "${INSTALL_ROOT}/config"
  ok "config written ${cfg_dir}/development.yaml"
}

install_cli() {
  [[ "$WITH_CLI" -eq 0 ]] && return 0
  if command -v temporal &>/dev/null; then
    ok "temporal CLI already on PATH"
    return 0
  fi
  local tmp tdir
  tmp="$(mktemp)"
  log "download temporal CLI ${CLI_URL}"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "+ curl ... ${CLI_URL}"
    rm -f "$tmp"
    return 0
  fi
  if curl -fsSL -o "$tmp" "$CLI_URL"; then
    tdir="$(mktemp -d)"
    tar -xzf "$tmp" -C "$tdir"
    # Archive contains binary named `temporal` at top level
    if [[ -x "${tdir}/temporal" ]]; then
      install -m 0755 "${tdir}/temporal" /usr/local/bin/temporal
      rm -rf "$tdir" "$tmp"
      ok "installed /usr/local/bin/temporal ${TEMPORAL_CLI_VER}"
    else
      warn "temporal CLI archive missing temporal binary — listing:"
      find "$tdir" -maxdepth 2 -type f 2>/dev/null || true
      rm -rf "$tdir" "$tmp"
    fi
  else
    warn "could not download temporal CLI — namespace registration manual"
    rm -f "$tmp"
  fi
}

write_systemd() {
  local unit=/etc/systemd/system/temporal-server.service
  local tmpf
  tmpf="$(mktemp)"

  cat >"$tmpf" <<EOF
[Unit]
Description=Temporal server (native)
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=temporal
Group=temporal
WorkingDirectory=${CURRENT_LINK}
EnvironmentFile=-${TEMPORAL_ENV_FILE}
ExecStart=${CURRENT_LINK}/temporal-server --root ${CURRENT_LINK} --env development --allow-no-auth start
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: systemd unit ${unit}"
    cat "$tmpf"
    rm -f "$tmpf"
    return 0
  fi

  mv "$tmpf" "$unit"
  chmod 0644 "$unit"
  systemctl daemon-reload
  systemctl enable temporal-server.service
  ok "systemd unit ${unit}"
}

# If something other than systemd-managed temporal-server already listens on :7233,
# systemd start will fail. Prefer explicit --stop-conflicting to terminate stray binaries.
resolve_port_7233_conflict() {
  local listening=0
  if command -v ss >/dev/null && ss -tln 2>/dev/null | grep -qE '(:7233\[|:7233\s)'; then
    listening=1
  fi
  [[ "$listening" -eq 1 ]] || return 0

  if systemctl is-active --quiet temporal-server.service 2>/dev/null; then
    ok "7233 already served by temporal-server.service — will restart"
    return 0
  fi

  if [[ "$STOP_CONFLICTING" -ne 1 ]]; then
    err "Port 7233 is in use but temporal-server.service is not active. Stop the manual temporal process first, or re-run with --stop-conflicting (only kills LISTEN processes whose command line looks like temporal)."
  fi

  log "7233 in use by non-systemd process — attempting safe stop (--stop-conflicting)"
  local pids
  pids="$(ss -tlnp 2>/dev/null | grep -E ':7233\b' | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u || true)"
  if [[ -z "$pids" ]] && command -v lsof >/dev/null; then
    pids="$(lsof -t -iTCP:7233 -sTCP:LISTEN 2>/dev/null || true)"
  fi

  for pid in $pids; do
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    local cmdline
    cmdline="$(tr '\0' ' ' < "/proc/${pid}/cmdline" 2>/dev/null || echo "")"
    if [[ "$cmdline" != *temporal* ]]; then
      warn "skip pid ${pid} on 7233 (cmdline does not look like temporal): ${cmdline:0:120}"
      continue
    fi
    log "stopping pid ${pid} (temporal on 7233)"
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
  done

  sleep 1
  if ss -tln 2>/dev/null | grep -qE '(:7233\[|:7233\s)'; then
    err "Port 7233 still busy after --stop-conflicting — inspect: ss -tlnp | grep 7233"
  fi
  ok "7233 free for systemd temporal-server"
}

start_service() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: skip systemctl start"
    return 0
  fi
  resolve_port_7233_conflict
  systemctl restart temporal-server.service || systemctl start temporal-server.service
  sleep 2
  if systemctl is-active --quiet temporal-server.service; then
    ok "temporal-server.service is active"
  else
    warn "temporal-server.service not active — check journalctl -u temporal-server"
  fi
}

main() {
  load_temporal_env_file
  generate_temporal_secrets_if_requested
  preflight
  ensure_user
  download_extract
  bootstrap_postgres
  setup_schema
  write_config
  install_cli
  write_systemd
  start_service

  cat <<EOF

Next steps (namespace — matches docker-compose DEFAULT_NAMESPACE=ai-os):

  export TEMPORAL_ADDRESS=127.0.0.1:7233
  temporal operator namespace describe ai-os || temporal operator namespace create ai-os --retention 72h

Workers expect frontend at 127.0.0.1:7233 (see ports.allocation.json).

EOF
}

main "$@"
