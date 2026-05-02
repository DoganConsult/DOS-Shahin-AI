#!/usr/bin/env bash
# install.sh — Native self-hosted observability stack installer (no Docker).
# Production-grade: every config is COPIED (not symlinked) into /etc/<svc>/
# with explicit owner:group:mode, so service users never need to traverse /root/.
#
# Installs Prometheus, Alertmanager, Grafana, Jaeger, Loki, and ClickHouse via
# apt + upstream binary releases, wires up systemd units from ./systemd/, and
# starts them.
#
# Usage:
#   sudo ops/monitoring/native/install.sh                    # install all 6
#   sudo ops/monitoring/native/install.sh prometheus         # single service
#   sudo ops/monitoring/native/install.sh reconcile          # re-copy configs
#                                                             # from repo into
#                                                             # /etc/ and reload
#
# After install, edits to configs under ops/monitoring/ are picked up by:
#   sudo /usr/local/sbin/dos-obs-reconcile
#
# Idempotent: safe to re-run. Pins versions via env vars (see top of file).

set -Eeuo pipefail

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MON_DIR="$(cd -- "${HERE}/.." && pwd)"
REPO_ROOT="$(cd -- "${MON_DIR}/../.." && pwd)"

PROM_VERSION="${PROM_VERSION:-2.53.0}"
ALERTMANAGER_VERSION="${ALERTMANAGER_VERSION:-0.27.0}"
JAEGER_VERSION="${JAEGER_VERSION:-1.58.1}"
LOKI_VERSION="${LOKI_VERSION:-3.1.0}"
ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
case "$ARCH" in
  amd64|x86_64) GOARCH=amd64 ;;
  arm64|aarch64) GOARCH=arm64 ;;
  *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;
esac

log() { printf '[native-install] %s\n' "$*"; }
err() { printf '[native-install][ERROR] %s\n' "$*" >&2; }
need_root() { [[ $EUID -eq 0 ]] || { err "run with sudo"; exit 1; }; }

trap 'err "failed at line $LINENO (exit $?)"; exit 1' ERR

ensure_user() {
  local user="$1" home="$2"
  id "$user" >/dev/null 2>&1 || useradd --system --no-create-home --home-dir "$home" --shell /usr/sbin/nologin "$user"
}

# copy_config SRC DEST OWNER MODE
#   Copies a file from the repo into /etc, setting explicit owner + mode.
#   Never a symlink — service users must not depend on /root traversal.
copy_config() {
  local src="$1" dest="$2" owner="$3" mode="$4"
  install -D -m "$mode" -o "$owner" -g "$owner" "$src" "$dest"
}

# copy_tree SRC_DIR DEST_DIR OWNER DIR_MODE FILE_MODE
#   Copies every file under SRC_DIR to DEST_DIR with explicit attributes.
#   If DEST_DIR currently exists as a SYMLINK (e.g. from an earlier install),
#   the symlink is removed first so the copy lands in a real directory.
copy_tree() {
  local src="$1" dest="$2" owner="$3" dmode="$4" fmode="$5"
  [[ -L "$dest" ]] && rm -f "$dest"
  install -d -m "$dmode" -o "$owner" -g "$owner" "$dest"
  local f rel
  while IFS= read -r -d '' f; do
    rel="${f#$src/}"
    install -D -m "$fmode" -o "$owner" -g "$owner" "$f" "$dest/$rel"
  done < <(find "$src" -type f -print0)
}

install_prometheus() {
  log "Installing Prometheus ${PROM_VERSION}"
  ensure_user prometheus /var/lib/prometheus
  install -d -m 0755 -o prometheus -g prometheus /var/lib/prometheus
  install -d -m 0755 -o prometheus -g prometheus /etc/prometheus
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-${GOARCH}.tar.gz" \
    | tar -xz -C "$tmp"
  install -m 0755 "$tmp"/prometheus-*/prometheus /usr/local/bin/prometheus
  install -m 0755 "$tmp"/prometheus-*/promtool   /usr/local/bin/promtool
  rm -rf "$tmp"
  copy_config "${MON_DIR}/prometheus.yml" /etc/prometheus/prometheus.yml prometheus 0644
  copy_config "${MON_DIR}/alerts.yml"     /etc/prometheus/alerts.yml     prometheus 0644
  copy_tree   "${MON_DIR}/generated"      /etc/prometheus/generated      prometheus 0755 0644
  install -m 0644 "${HERE}/systemd/prometheus.service" /etc/systemd/system/prometheus.service
  systemctl daemon-reload
  systemctl enable prometheus
  systemctl restart prometheus
}

install_alertmanager() {
  log "Installing Alertmanager ${ALERTMANAGER_VERSION}"
  ensure_user alertmanager /var/lib/alertmanager
  install -d -m 0755 -o alertmanager -g alertmanager /var/lib/alertmanager
  install -d -m 0755 -o root -g alertmanager /etc/alertmanager
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/prometheus/alertmanager/releases/download/v${ALERTMANAGER_VERSION}/alertmanager-${ALERTMANAGER_VERSION}.linux-${GOARCH}.tar.gz" \
    | tar -xz -C "$tmp"
  install -m 0755 "$tmp"/alertmanager-*/alertmanager /usr/local/bin/alertmanager
  install -m 0755 "$tmp"/alertmanager-*/amtool       /usr/local/bin/amtool
  rm -rf "$tmp"
  copy_config "${MON_DIR}/alertmanager.yml" /etc/alertmanager/alertmanager.yml.tmpl alertmanager 0640
  if [[ ! -f /etc/alertmanager/alertmanager.env ]]; then
    install -m 0640 -o root -g alertmanager /dev/stdin /etc/alertmanager/alertmanager.env <<'EOF'
# Set secrets here; keep mode 0640 root:alertmanager.
PAGERDUTY_SERVICE_KEY=
OPSGENIE_API_KEY=
EOF
  fi
  install -m 0755 "${HERE}/bin/alertmanager-render-config" /usr/local/sbin/alertmanager-render-config
  install -m 0644 "${HERE}/systemd/alertmanager.service"   /etc/systemd/system/alertmanager.service
  systemctl daemon-reload
  systemctl enable alertmanager
  systemctl restart alertmanager
}

install_grafana() {
  log "Installing Grafana (official apt repo)"
  if [[ ! -f /etc/apt/sources.list.d/grafana.list ]]; then
    install -d -m 0755 /etc/apt/keyrings
    curl -fsSL https://apt.grafana.com/gpg.key | gpg --dearmor -o /etc/apt/keyrings/grafana.gpg
    echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" > /etc/apt/sources.list.d/grafana.list
    apt-get update
  fi
  DEBIAN_FRONTEND=noninteractive apt-get install -y grafana
  install -d -m 0755 -o grafana -g grafana /var/lib/grafana/dashboards
  # Provisioning + dashboards: COPY from repo into /etc/grafana and /var/lib/grafana
  rm -rf /etc/grafana/provisioning
  copy_tree "${MON_DIR}/grafana/provisioning" /etc/grafana/provisioning grafana 0755 0644
  copy_tree "${MON_DIR}/dashboards"           /var/lib/grafana/dashboards grafana 0755 0644
  local env_path=/etc/default/grafana-server
  [[ -d /etc/sysconfig ]] && env_path=/etc/sysconfig/grafana-server
  install -m 0640 -o root -g grafana "${HERE}/systemd/grafana-server.env" "${env_path}"
  systemctl daemon-reload
  systemctl enable grafana-server
  systemctl restart grafana-server
}

install_jaeger() {
  log "Installing Jaeger ${JAEGER_VERSION}"
  ensure_user jaeger /var/lib/jaeger
  install -d -m 0755 -o jaeger -g jaeger /var/lib/jaeger
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/jaegertracing/jaeger/releases/download/v${JAEGER_VERSION}/jaeger-${JAEGER_VERSION}-linux-${GOARCH}.tar.gz" \
    | tar -xz -C "$tmp"
  install -m 0755 "$tmp"/jaeger-*/jaeger-all-in-one /usr/local/bin/jaeger-all-in-one
  rm -rf "$tmp"
  install -m 0644 "${HERE}/systemd/jaeger.service" /etc/systemd/system/jaeger.service
  systemctl daemon-reload
  systemctl enable jaeger
  systemctl restart jaeger
}

install_loki() {
  log "Installing Loki ${LOKI_VERSION}"
  ensure_user loki /var/lib/loki
  install -d -m 0755 -o loki -g loki /var/lib/loki
  install -d -m 0755 -o root -g loki /etc/loki
  local tmp; tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/grafana/loki/releases/download/v${LOKI_VERSION}/loki-linux-${GOARCH}.zip" -o "$tmp/loki.zip"
  ( cd "$tmp" && unzip -q loki.zip )
  install -m 0755 "$tmp/loki-linux-${GOARCH}" /usr/local/bin/loki
  rm -rf "$tmp"
  copy_config "${MON_DIR}/loki.yml" /etc/loki/loki.yml loki 0644
  install -m 0644 "${HERE}/systemd/loki.service" /etc/systemd/system/loki.service
  systemctl daemon-reload
  systemctl enable loki
  systemctl restart loki
}

install_clickhouse() {
  log "Installing ClickHouse (official apt repo)"
  if [[ ! -f /etc/apt/sources.list.d/clickhouse.list ]]; then
    # Official Debian/Ubuntu install flow (per https://clickhouse.com/docs/install):
    # use keyserver.ubuntu.com with the published key ID, not a URL-fetched key.
    apt-get install -y apt-transport-https ca-certificates dirmngr
    local gnupghome
    gnupghome="$(mktemp -d)"
    GNUPGHOME="$gnupghome" gpg --no-default-keyring \
      --keyring /usr/share/keyrings/clickhouse-keyring.gpg \
      --keyserver hkp://keyserver.ubuntu.com:80 \
      --recv-keys 8919F6BD2B48D754
    rm -rf "$gnupghome"
    chmod +r /usr/share/keyrings/clickhouse-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" \
      > /etc/apt/sources.list.d/clickhouse.list
    apt-get update
  fi
  DEBIAN_FRONTEND=noninteractive apt-get install -y clickhouse-server clickhouse-client
  install -d /etc/systemd/system/clickhouse-server.service.d
  install -m 0644 "${HERE}/systemd/clickhouse-server.service.d-override.conf" \
    /etc/systemd/system/clickhouse-server.service.d/override.conf
  systemctl daemon-reload
  systemctl enable clickhouse-server
  systemctl restart clickhouse-server
}

install_reconciler() {
  log "Installing dos-obs-reconcile helper"
  install -m 0755 "${HERE}/bin/dos-obs-reconcile" /usr/local/sbin/dos-obs-reconcile
}

reconcile() {
  need_root
  /usr/local/sbin/dos-obs-reconcile
}

main() {
  need_root
  local target="${1:-all}"
  case "$target" in
    all)
      install_reconciler
      install_prometheus
      install_alertmanager
      install_clickhouse
      install_loki
      install_jaeger
      install_grafana
      ;;
    prometheus|alertmanager|grafana|jaeger|loki|clickhouse)
      install_reconciler
      "install_${target}"
      ;;
    reconcile)
      reconcile
      ;;
    *)
      echo "usage: $0 [all|prometheus|alertmanager|grafana|jaeger|loki|clickhouse|reconcile]" >&2
      exit 2
      ;;
  esac
  log "Done. Health checks:"
  log "  curl -sf http://localhost:9090/-/healthy     # prometheus"
  log "  curl -sf http://localhost:9093/-/healthy     # alertmanager"
  log "  curl -sf http://localhost:3001/api/health    # grafana"
  log "  curl -sf http://localhost:16686/             # jaeger UI"
  log "  curl -sf http://localhost:3100/ready         # loki"
  log "  curl -sf http://localhost:8123/ping          # clickhouse"
}

main "$@"
