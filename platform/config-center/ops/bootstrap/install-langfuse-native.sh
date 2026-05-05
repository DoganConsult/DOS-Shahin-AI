#!/usr/bin/env bash
# DOS Platform — Langfuse v3 native install (bare metal, systemd).
#
# Clones github.com/langfuse/langfuse, installs deps with pnpm, builds web+worker,
# runs Postgres migrations (pnpm run db:migrate), installs systemd units
# langfuse-web.service + langfuse-worker.service, and writes PM2-compatible
# /opt/langfuse/start.sh (+ symlink /opt/langfuse/.env → /etc/langfuse/langfuse.env).
#
# Mirrors ecosystem expectation:
#   platform/config-center/ops/ecosystem.m1.config.js → langfuse script /opt/langfuse/start.sh
#   platform/config-center/ops/ports.allocation.json  → sidecars.langfuse.checkPath
#
# Prerequisites (operator-managed): PostgreSQL, Redis, ClickHouse, S3-compatible storage.
# Env template: platform/config-center/env/langfuse.env.example
#
# Usage:
#   sudo cp platform/config-center/env/langfuse.env.example /etc/langfuse/langfuse.env
#   sudo chmod 0600 /etc/langfuse/langfuse.env && sudo nano /etc/langfuse/langfuse.env
#   sudo bash ops/bootstrap/install-langfuse-native.sh
#
# Optional env / flags:
#   LANGFUSE_REF=main|v3.x.y          Git ref to clone (default: main — pin a tag in prod)
#   LANGFUSE_HOME=/opt/langfuse       Install prefix
#   LANGFUSE_REPO=https://github.com/langfuse/langfuse.git
#   ENV_FILE=/etc/langfuse/langfuse.env   Override env path (created from template if missing)
#   --dry-run                         Print actions only
#   --skip-migrate                    Skip pnpm run db:migrate (after first successful migrate)
#   --without-systemd               Do not write/enable systemd units (PM2-only hosts)
#   --skip-build                    Skip pnpm run build (debug / CI artifact reuse)
#   --generate-secrets              Fill placeholder secrets in ENV_FILE via openssl (chmod 600)
#   --force-regenerate-secrets      With --generate-secrets: overwrite even non-placeholder values (dangerous)
#
# Idempotent-ish — safe to re-run after fixing env; migrations are additive.

set -euo pipefail

DRY_RUN=0
SKIP_MIGRATE=0
WITHOUT_SYSTEMD=0
SKIP_BUILD=0
GENERATE_SECRETS=0
FORCE_REGEN_SECRETS=0

for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    --skip-migrate) SKIP_MIGRATE=1 ;;
    --without-systemd) WITHOUT_SYSTEMD=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --generate-secrets) GENERATE_SECRETS=1 ;;
    --force-regenerate-secrets) FORCE_REGEN_SECRETS=1 ;;
    -h|--help)
      sed -n '1,/^set -euo/p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Unknown arg: $a" >&2; exit 2 ;;
  esac
done

LANGFUSE_HOME="${LANGFUSE_HOME:-/opt/langfuse}"
LANGFUSE_REPO="${LANGFUSE_REPO:-https://github.com/langfuse/langfuse.git}"
LANGFUSE_REF="${LANGFUSE_REF:-main}"
ENV_DIR=/etc/langfuse
ENV_FILE="${ENV_FILE:-${ENV_DIR}/langfuse.env}"
REPO_DIR="${LANGFUSE_HOME}/repo"
CURRENT_LINK="${LANGFUSE_HOME}/current"
START_SH="${LANGFUSE_HOME}/start.sh"

LANGFUSE_UID="${LANGFUSE_UID:-3991}"
LANGFUSE_GID="${LANGFUSE_GID:-3991}"

log()  { printf '\033[0;36m[langfuse]\033[0m %s\n' "$*"; }
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

validate_secret_flags() {
  if [[ "$FORCE_REGEN_SECRETS" -eq 1 && "$GENERATE_SECRETS" -eq 0 ]]; then
    err "--force-regenerate-secrets requires --generate-secrets"
  fi
}

require_langfuse_host_tools() {
  command -v git >/dev/null 2>&1 || err "git not found — install git"
  if [[ "$GENERATE_SECRETS" -eq 1 ]]; then
    command -v openssl >/dev/null 2>&1 || err "openssl required for --generate-secrets"
  fi
}

require_root() { [[ "${EUID:-0}" -eq 0 ]] || err "must run as root (sudo)"; }

detect_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi
  err "node not found — install Node.js ≥ 22 (Node 24 recommended for Langfuse upstream)"
}

detect_pnpm() {
  # Prefer corepack-activated pnpm on PATH (installer runs as root)
  if command -v pnpm >/dev/null 2>&1; then
    command -v pnpm
    return 0
  fi
  err "pnpm not found — enable corepack: corepack enable && corepack prepare pnpm@10.22.0 --activate"
}

# pnpm used by langfuse after corepack (must match systemd ExecStart user)
resolve_pnpm_bin() {
  local node_bin node_dir
  node_bin="$(readlink -f "$(command -v node)")"
  node_dir="$(dirname "$node_bin")"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '%s\n' "${node_dir}/pnpm"
    return 0
  fi
  sudo -u langfuse bash -lc "export PATH=\"${node_dir}:/usr/local/bin:/usr/bin:\$PATH\"; command -v pnpm" \
    || err "pnpm not found for user langfuse — run corepack enable as langfuse (enable_corepack_pnpm step)"
}

ensure_user_group() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: ensure group langfuse (${LANGFUSE_GID}) + user langfuse (${LANGFUSE_UID})"
    return 0
  fi
  if ! getent group langfuse >/dev/null 2>&1; then
    groupadd --gid "$LANGFUSE_GID" langfuse
    ok "created group langfuse (${LANGFUSE_GID})"
  else
    ok "group langfuse exists"
  fi
  if ! id -u langfuse >/dev/null 2>&1; then
    useradd --uid "$LANGFUSE_UID" --gid langfuse \
      --home-dir "$LANGFUSE_HOME" --create-home \
      --shell /usr/sbin/nologin \
      --comment "Langfuse observability" \
      langfuse
    ok "created user langfuse (${LANGFUSE_UID})"
  else
    ok "user langfuse exists"
  fi
}

ensure_dirs() {
  run mkdir -p "$LANGFUSE_HOME" "$ENV_DIR"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: chown ${LANGFUSE_HOME} → langfuse:langfuse"
    return 0
  fi
  chown langfuse:langfuse "$LANGFUSE_HOME"
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    ok "env file exists ${ENV_FILE}"
    return 0
  fi
  local example
  example="$(dirname "$0")/../../env/langfuse.env.example"
  if [[ ! -f "$example" ]]; then
    err "missing template ${example} — sync repo"
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: cp ${example} → ${ENV_FILE}"
    return 0
  fi
  install -o root -g root -m 0644 "$example" "$ENV_FILE"
  warn "created ${ENV_FILE} from template — EDIT secrets before first migrate/start"
}

# Returns 0 if value looks like a template placeholder or empty (eligible for --generate-secrets).
is_langfuse_secret_placeholder() {
  local v="${1:-}"
  [[ -z "$v" ]] && return 0
  [[ "$v" == CHANGE_ME ]] && return 0
  [[ "$v" == CHANGE_ME* ]] && return 0
  return 1
}

gen_langfuse_secret_for_key() {
  case "$1" in
    NEXTAUTH_SECRET|ENCRYPTION_KEY) openssl rand -hex 32 ;;
    SALT) openssl rand -hex 24 ;;
    *) openssl rand -hex 16 ;;
  esac
}

# Fill placeholder (or all managed secrets if --force-regenerate-secrets) in ENV_FILE using openssl only.
generate_langfuse_secrets_if_requested() {
  [[ "$GENERATE_SECRETS" -eq 0 ]] && return 0
  command -v openssl >/dev/null 2>&1 || err "openssl required for --generate-secrets"

  if [[ ! -f "$ENV_FILE" ]]; then
    err "ENV_FILE missing for --generate-secrets: ${ENV_FILE}"
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: --generate-secrets would patch placeholders in ${ENV_FILE} (openssl rand …)"
    return 0
  fi

  local tmp changed=0 line key val newv user pass suf np
  tmp="$(mktemp)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ "$line" =~ ^[[:space:]]*$ ]]; then
      printf '%s\n' "$line" >>"$tmp"
      continue
    fi
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
      case "$key" in
        NEXTAUTH_SECRET|SALT|ENCRYPTION_KEY|CLICKHOUSE_PASSWORD|REDIS_AUTH|LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY|LANGFUSE_S3_MEDIA_UPLOAD_SECRET_ACCESS_KEY)
          if [[ "$FORCE_REGEN_SECRETS" -eq 1 ]] || is_langfuse_secret_placeholder "$val"; then
            newv="$(gen_langfuse_secret_for_key "$key")"
            printf '%s=%s\n' "$key" "$newv" >>"$tmp"
            changed=1
            continue
          fi
          ;;
        DATABASE_URL)
          if [[ "$val" =~ ^postgresql://([^:]+):([^@]*)@(.*)$ ]]; then
            user="${BASH_REMATCH[1]}"
            pass="${BASH_REMATCH[2]}"
            suf="${BASH_REMATCH[3]}"
            if [[ "$FORCE_REGEN_SECRETS" -eq 1 ]] || is_langfuse_secret_placeholder "$pass"; then
              np="$(openssl rand -hex 16)"
              printf 'DATABASE_URL=postgresql://%s:%s@%s\n' "$user" "$np" "$suf" >>"$tmp"
              changed=1
              continue
            fi
          fi
          ;;
      esac
    fi
    printf '%s\n' "$line" >>"$tmp"
  done <"$ENV_FILE"

  if [[ "$changed" -eq 1 ]]; then
    mv "$tmp" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    warn "generated secrets in ${ENV_FILE} — backup outside the host, rotate in production, DO NOT commit"
  else
    rm -f "$tmp"
    ok "no managed Langfuse secrets replaced (placeholders already filled — use --force-regenerate-secrets to overwrite)"
  fi
}

symlink_env_into_home() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: ln -sf ${ENV_FILE} ${LANGFUSE_HOME}/.env"
    return 0
  fi
  ln -sf "$ENV_FILE" "${LANGFUSE_HOME}/.env"
  ok "symlink ${LANGFUSE_HOME}/.env → ${ENV_FILE}"
}

clone_or_update() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: git clone/update ${LANGFUSE_REPO} ref=${LANGFUSE_REF} → ${REPO_DIR}"
    return 0
  fi

  if [[ -d "${REPO_DIR}/.git" ]]; then
    log "fetch + checkout ${LANGFUSE_REF} in ${REPO_DIR}"
    git -C "$REPO_DIR" fetch --depth 1 origin "$LANGFUSE_REF" 2>/dev/null \
      || git -C "$REPO_DIR" fetch origin "refs/tags/${LANGFUSE_REF}:refs/tags/${LANGFUSE_REF}" 2>/dev/null \
      || git -C "$REPO_DIR" fetch origin
    git -C "$REPO_DIR" checkout -q "$LANGFUSE_REF" \
      || git -C "$REPO_DIR" checkout -q "tags/${LANGFUSE_REF}" \
      || err "cannot checkout ${LANGFUSE_REF} — pin an existing branch/tag"
  else
    log "clone ${LANGFUSE_REPO} (--depth 1) ref=${LANGFUSE_REF}"
    rm -rf "$REPO_DIR"
    git clone --depth 1 --branch "$LANGFUSE_REF" "$LANGFUSE_REPO" "$REPO_DIR" \
      || {
        warn "branch clone failed — retry as detached tag checkout"
        git clone --depth 1 "$LANGFUSE_REPO" "$REPO_DIR"
        git -C "$REPO_DIR" fetch --depth 1 origin "refs/tags/${LANGFUSE_REF}:refs/tags/${LANGFUSE_REF}"
        git -C "$REPO_DIR" checkout -q "$LANGFUSE_REF"
      }
  fi

  chown -R langfuse:langfuse "$REPO_DIR"
  ln -sfn "$REPO_DIR" "$CURRENT_LINK"
  chown -h langfuse:langfuse "$CURRENT_LINK" 2>/dev/null || true
  ok "current → ${REPO_DIR}"
}

run_as_langfuse() {
  local cmd="$1"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: sudo -u langfuse bash -lc $(printf '%q' "$cmd")"
    return 0
  fi
  sudo -u langfuse --preserve-env=HOME bash -lc "$cmd"
}

enable_corepack_pnpm() {
  local node_bin pnpm_ver
  node_bin="$(detect_node)"
  pnpm_ver="10.22.0"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: corepack enable + prepare pnpm@${pnpm_ver}"
    return 0
  fi
  if [[ ! -x "$node_bin" ]]; then
    err "node binary missing"
  fi
  run_as_langfuse "cd '${CURRENT_LINK}' && export PATH=\"\$(dirname '${node_bin}'):\$PATH\" && command -v corepack >/dev/null && corepack enable && corepack prepare pnpm@${pnpm_ver} --activate"
  ok "corepack pnpm ${pnpm_ver} (langfuse user)"
}

install_build() {
  local pnpm_bin node_dir
  node_dir="$(dirname "$(readlink -f "$(command -v node)")")"
  pnpm_bin="$(resolve_pnpm_bin)"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: pnpm install + build in ${CURRENT_LINK}"
    return 0
  fi
  run_as_langfuse "cd '${CURRENT_LINK}' && export PATH=\"${node_dir}:/usr/local/bin:/usr/bin:\$PATH\" && $(printf '%q' "$pnpm_bin") install --frozen-lockfile 2>/dev/null || $(printf '%q' "$pnpm_bin") install"
  if [[ "$SKIP_BUILD" -eq 1 ]]; then
    warn "--skip-build set — skipping pnpm run build"
    return 0
  fi
  run_as_langfuse "cd '${CURRENT_LINK}' && export PATH=\"${node_dir}:/usr/local/bin:/usr/bin:\$PATH\" && $(printf '%q' "$pnpm_bin") run build"
  ok "pnpm install + build complete"
}

run_migrate() {
  [[ "$SKIP_MIGRATE" -eq 1 ]] && { warn "--skip-migrate — skipping db:migrate"; return 0; }
  local pnpm_bin node_dir
  node_dir="$(dirname "$(readlink -f "$(command -v node)")")"
  pnpm_bin="$(resolve_pnpm_bin)"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: source ${ENV_FILE} && pnpm run db:migrate"
    return 0
  fi
  run_as_langfuse "set -a && source $(printf '%q' "$ENV_FILE") && set +a && cd '${CURRENT_LINK}' && export PATH=\"${node_dir}:/usr/local/bin:/usr/bin:\$PATH\" && $(printf '%q' "$pnpm_bin") run db:migrate"
  ok "database migrations applied"
}

write_start_sh() {
  local tmpf node_dir
  node_dir="$(dirname "$(readlink -f "$(command -v node)")")"
  tmpf="$(mktemp)"
  cat >"$tmpf" <<EOS
#!/usr/bin/env bash
# PM2-compatible launcher: worker (background) + web (foreground).
# Sources /opt/langfuse/.env (symlink to /etc/langfuse/langfuse.env).
set -euo pipefail
export PATH="${node_dir}:/usr/local/bin:/usr/bin:\${PATH}"
PREFIX="\${LANGFUSE_PREFIX:-/opt/langfuse}"
cd "\${PREFIX}/current"
if [[ -f "\${PREFIX}/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "\${PREFIX}/.env"
  set +a
fi
export PORT="\${PORT:-4090}"
export HOSTNAME="\${HOSTNAME:-127.0.0.1}"
WORKER_PID=""
cleanup() {
  [[ -n "\${WORKER_PID}" ]] && kill "\${WORKER_PID}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
pnpm --filter worker run start &
WORKER_PID=\$!
exec pnpm --filter web run start
EOS
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: write ${START_SH}"
    cat "$tmpf"
    rm -f "$tmpf"
    return 0
  fi
  install -o langfuse -g langfuse -m 0755 "$tmpf" "$START_SH"
  rm -f "$tmpf"
  ok "wrote ${START_SH}"
}

write_systemd() {
  [[ "$WITHOUT_SYSTEMD" -eq 1 ]] && { warn "--without-systemd — skip unit files"; return 0; }

  local pnpm_bin node_dir
  node_dir="$(dirname "$(readlink -f "$(command -v node)")")"
  pnpm_bin="$(resolve_pnpm_bin)"

  local env_line=""
  [[ -f "$ENV_FILE" ]] && env_line="EnvironmentFile=-${ENV_FILE}"

  local tmp_web tmp_worker
  tmp_web="$(mktemp)"
  tmp_worker="$(mktemp)"

  cat >"$tmp_web" <<EOF
[Unit]
Description=Langfuse web (Next.js), DOS native
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=langfuse
Group=langfuse
WorkingDirectory=${CURRENT_LINK}
${env_line}
Environment=PATH=${node_dir}:/usr/local/bin:/usr/bin
Environment=NODE_ENV=production
ExecStart=${pnpm_bin} --filter web run start
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

  cat >"$tmp_worker" <<EOF
[Unit]
Description=Langfuse worker (ingestion), DOS native
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=langfuse
Group=langfuse
WorkingDirectory=${CURRENT_LINK}
${env_line}
Environment=PATH=${node_dir}:/usr/local/bin:/usr/bin
Environment=NODE_ENV=production
ExecStart=${pnpm_bin} --filter worker run start
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: systemd units langfuse-web.service / langfuse-worker.service"
    cat "$tmp_web"
    echo "---"
    cat "$tmp_worker"
    rm -f "$tmp_web" "$tmp_worker"
    return 0
  fi

  mv "$tmp_web" /etc/systemd/system/langfuse-web.service
  mv "$tmp_worker" /etc/systemd/system/langfuse-worker.service
  chmod 0644 /etc/systemd/system/langfuse-web.service /etc/systemd/system/langfuse-worker.service
  systemctl daemon-reload
  systemctl enable langfuse-web.service langfuse-worker.service
  ok "systemd units installed + enabled"
}

start_services() {
  [[ "$WITHOUT_SYSTEMD" -eq 1 ]] && { warn "systemd disabled — start PM2 or run ${START_SH} manually"; return 0; }
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "dry-run: systemctl restart langfuse-web langfuse-worker"
    return 0
  fi
  systemctl restart langfuse-web.service langfuse-worker.service || {
    warn "systemctl restart failed — check journalctl -u langfuse-web -u langfuse-worker"
    return 1
  }
  ok "langfuse-web + langfuse-worker restarted"
}

main() {
  validate_secret_flags
  require_root
  require_langfuse_host_tools
  log "using node: $(detect_node)"

  if [[ "$LANGFUSE_REF" == "main" ]]; then
    warn "LANGFUSE_REF=main — pin a release tag (e.g. LANGFUSE_REF=v3.131.0) for production"
  fi

  ensure_user_group
  ensure_dirs
  ensure_env_file
  generate_langfuse_secrets_if_requested
  symlink_env_into_home
  clone_or_update
  enable_corepack_pnpm
  install_build
  run_migrate
  write_start_sh
  write_systemd
  start_services

  ok "Langfuse install finished — runbook: platform/config-center/ops/runbooks/langfuse-native.md"
}

main "$@"
