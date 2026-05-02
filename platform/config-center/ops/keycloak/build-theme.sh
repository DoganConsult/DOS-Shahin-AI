#!/usr/bin/env bash
#
# Deploy the Dogan Keycloak theme to a native (non-Docker) Keycloak install.
#
# What this does:
#   1. rsync ops/keycloak-themes/<theme>/ → /opt/keycloak/themes/<theme>/
#   2. chown to keycloak:keycloak (KC runs as the keycloak user)
#   3. clear the gzip cache (otherwise stale gzipped responses survive)
#   4. systemctl restart keycloak  (re-mints the resource version + theme cache)
#   5. write ops/keycloak/.theme-version with the deployed git SHA
#
# Why the restart is mandatory:
#   Keycloak caches theme files at startup with an immutable resource version
#   (the segment in /resources/<ver>/login/<theme>/...). New files added after
#   start are not picked up until the next restart. Skipping the restart is
#   what produced the 2026-04-23 unstyled-registration-page outage.
#
# Why the gzip cache wipe:
#   /opt/keycloak/data/tmp/kc-gzip-cache caches per-version compressed assets.
#   Stale entries can serve broken bytes even after restart in edge cases.
#
# Why no JAR pipeline:
#   This native install loads themes from the filesystem directly via
#   spi-theme-static-max-age + classpath providers. The JAR/META-INF approach
#   is for the Docker/provider-spi distribution pattern; we do not use it.
#   See memory: "Keycloak native deploy 2026-04-24".
#
# Usage:
#   ops/keycloak/build-theme.sh                # deploy + restart (default)
#   ops/keycloak/build-theme.sh --no-restart   # deploy only (CI gate fails)
#   THEME=dogan ops/keycloak/build-theme.sh    # deploy a specific theme
#
# Exit codes:
#   0  success
#   1  rsync or restart failure
#   2  theme source dir missing
#   3  not run as root (rsync to /opt/keycloak/themes/ requires it)

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
THEME="${THEME:-dogan}"
THEME_SRC="$REPO_ROOT/ops/keycloak-themes/$THEME"
THEME_DST="/opt/keycloak/themes/$THEME"
GZIP_CACHE="/opt/keycloak/data/tmp/kc-gzip-cache"
VERSION_STAMP="$REPO_ROOT/ops/keycloak/.theme-version"
KC_SERVICE="keycloak"
KC_USER="keycloak"
KC_GROUP="keycloak"

DO_RESTART=1
for arg in "$@"; do
  case "$arg" in
    --no-restart) DO_RESTART=0 ;;
    -h|--help) sed -n '2,32p' "$0" | sed 's/^# \?//' ; exit 0 ;;
    *) echo "ERROR: unknown arg: $arg" >&2 ; exit 2 ;;
  esac
done

if [[ ! -d "$THEME_SRC" ]]; then
  echo "ERROR: theme source not found at $THEME_SRC" >&2
  exit 2
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "ERROR: must run as root (rsync to /opt/keycloak/themes/ + systemctl restart)" >&2
  exit 3
fi

echo "→ rsync $THEME_SRC/ → $THEME_DST/"
mkdir -p "$THEME_DST"
rsync -a --delete "$THEME_SRC/" "$THEME_DST/"

echo "→ chown $KC_USER:$KC_GROUP $THEME_DST"
chown -R "$KC_USER:$KC_GROUP" "$THEME_DST"

if [[ -d "$GZIP_CACHE" ]]; then
  echo "→ clear gzip cache $GZIP_CACHE"
  rm -rf "$GZIP_CACHE"
fi

if [[ "$DO_RESTART" -eq 1 ]]; then
  echo "→ systemctl restart $KC_SERVICE"
  systemctl restart "$KC_SERVICE"
  # Wait for KC to be ready (discovery doc returns 200)
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if curl -sf --max-time 3 "http://127.0.0.1:8180/realms/dogan/.well-known/openid-configuration" >/dev/null 2>&1; then
      echo "→ Keycloak ready after ${i}s"
      break
    fi
    sleep 1
  done
else
  echo "→ skipping restart (--no-restart) — CI gate will fail until next restart bumps .theme-version"
fi

# Write version stamp ONLY after successful deploy + restart. Used by the CI
# gate (ops/scripts/check-theme-restart-protocol.sh) to ensure rsync changes
# are not committed without a restart.
if [[ "$DO_RESTART" -eq 1 ]]; then
  if git -C "$REPO_ROOT" rev-parse --short HEAD >/dev/null 2>&1; then
    SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
  else
    SHA="dev"
  fi
  echo "$SHA $(date -u +%FT%TZ) $THEME" > "$VERSION_STAMP"
  echo "→ wrote $VERSION_STAMP: $SHA"
fi

echo "✓ Theme '$THEME' deployed to $THEME_DST"
