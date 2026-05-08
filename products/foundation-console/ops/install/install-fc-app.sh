#!/usr/bin/env bash
# Foundation Console — native install (no containers).
# Idempotent. Run as root on target host.
set -euo pipefail

FC_HOME=/opt/foundation-console
FC_USER=fc_app
FC_REPO_DIR="${FC_REPO_DIR:-$(dirname "$(dirname "$(dirname "$(readlink -f "$0")")")")}"

# Ensure user exists
id -u "$FC_USER" >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin "$FC_USER"

# Layout
install -d -o "$FC_USER" -g "$FC_USER" "$FC_HOME" "$FC_HOME/var"

# Sync app + services + packages (rsync excludes node_modules/dist sources)
rsync -a --delete \
  --exclude node_modules --exclude .git \
  "$FC_REPO_DIR/" "$FC_HOME/"

# Install prod deps
sudo -u "$FC_USER" bash -c "cd $FC_HOME && pnpm install --prod --frozen-lockfile"

# systemd units
install -m 0644 "$FC_REPO_DIR/ops/systemd/fc-foundation-gateway.service"     /etc/systemd/system/
install -m 0644 "$FC_REPO_DIR/ops/systemd/fc-foundation-ui-os.service"       /etc/systemd/system/
install -m 0644 "$FC_REPO_DIR/ops/systemd/fc-foundation-dynamic-ui.service"  /etc/systemd/system/
systemctl daemon-reload

# nginx
install -m 0644 "$FC_REPO_DIR/ops/nginx/foundation-console.conf" /etc/nginx/sites-available/foundation-console.conf
ln -sf /etc/nginx/sites-available/foundation-console.conf /etc/nginx/sites-enabled/foundation-console.conf
nginx -t

systemctl enable --now fc-foundation-ui-os.service
systemctl enable --now fc-foundation-dynamic-ui.service
systemctl enable --now fc-foundation-gateway.service
systemctl reload nginx

echo "Foundation Console installed. Verify:"
echo "  systemctl status 'fc-foundation-*'"
echo "  curl -sS http://127.0.0.1:3000/healthz"
