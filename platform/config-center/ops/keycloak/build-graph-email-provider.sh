#!/usr/bin/env bash
#
# Compile + package the Shahin Graph EmailSenderProvider JAR, drop it
# into /opt/keycloak/providers/, run kc.sh build, and restart Keycloak.
#
# Replaces Keycloak's default SMTP mailer with one that calls Microsoft
# Graph /users/{from}/sendMail using OAuth2 client credentials against
# the Shahin Azure AD app registration. See the provider source at
# ops/keycloak/providers/graph-email-sender/src/main/java/.../GraphEmailSenderProvider.java
# for the runtime contract and security invariants (loopback-free,
# sender allow-list, env-driven auth).
#
# Requires: JDK 11+ on PATH with javac + jar. KC 26 runs on JVM 21 but
# accepts bytecode targeted at Java 11+ (what this script produces).
#
# Usage:
#   sudo ops/keycloak/build-graph-email-provider.sh
#   sudo ops/keycloak/build-graph-email-provider.sh --no-restart

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
SRC_DIR="$HERE/providers/graph-email-sender"
BUILD_DIR="$SRC_DIR/build"
JAR_NAME="shahin-graph-email-sender.jar"
KC_PROVIDERS="/opt/keycloak/providers"
KC_DIR="/opt/keycloak"
KC_USER="keycloak"
KC_GROUP="keycloak"
KC_SERVICE="keycloak"

# Pick any JDK 11+ javac. KC 26 runs on JVM 21 but the bytecode target
# we emit is --release 11 so a JDK 11+ compiler is sufficient.
JAVAC="${JAVAC:-}"
if [[ -z "$JAVAC" ]]; then
  # KC 26 SPI jars are Java 17 bytecode (class file version 61.0), so a
  # Java 17+ javac is required. Try the 17/21 JDKs first, then fall back.
  for candidate in \
      /usr/lib/jvm/java-17-openjdk-amd64/bin/javac \
      /usr/lib/jvm/java-21-openjdk-amd64/bin/javac \
      /usr/lib/jvm/java-1.21.0-openjdk-amd64/bin/javac \
      /usr/bin/javac; do
    if [[ -x "$candidate" ]]; then JAVAC="$candidate"; break; fi
  done
fi
if [[ -z "$JAVAC" || ! -x "$JAVAC" ]]; then
  echo "ERROR: javac not found. Install default-jdk or set JAVAC=/path/to/javac." >&2
  exit 2
fi
JAR_BIN="${JAR_BIN:-$(dirname "$JAVAC")/jar}"
if [[ ! -x "$JAR_BIN" ]]; then
  echo "ERROR: jar not found at $JAR_BIN" >&2
  exit 2
fi

DO_RESTART=1
for arg in "$@"; do
  case "$arg" in
    --no-restart) DO_RESTART=0 ;;
    -h|--help) sed -n '2,22p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

if [[ "$EUID" -ne 0 ]]; then
  echo "ERROR: must run as root (writes to $KC_PROVIDERS + systemctl restart)." >&2
  exit 3
fi

# ── Classpath: pull KC server-spi-private jars (they carry EmailSenderProvider) ──
CP=""
for jar in /opt/keycloak/lib/lib/main/org.keycloak.keycloak-server-spi-26.*.jar \
           /opt/keycloak/lib/lib/main/org.keycloak.keycloak-server-spi-private-26.*.jar \
           /opt/keycloak/lib/lib/main/org.keycloak.keycloak-core-26.*.jar; do
  [[ -f "$jar" ]] && CP="$CP:$jar"
done
CP="${CP#:}"
if [[ -z "$CP" ]]; then
  echo "ERROR: could not locate Keycloak SPI jars under /opt/keycloak/lib/lib/main/" >&2
  exit 2
fi

# ── Compile ──
# Target Java 17 — matches KC's own SPI bytecode. KC 26 runs on JVM 21
# which accepts 17-targeted bytecode fine.
echo "→ compile (release 17) via $JAVAC"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/classes"
"$JAVAC" --release 17 \
  -cp "$CP" \
  -d "$BUILD_DIR/classes" \
  "$SRC_DIR"/src/main/java/com/shahin/keycloak/email/*.java

# ── Package ──
echo "→ package $JAR_NAME"
# Stage META-INF alongside classes so the jar tool bundles both.
mkdir -p "$BUILD_DIR/classes/META-INF/services"
cp "$SRC_DIR/src/main/resources/META-INF/services/org.keycloak.email.EmailSenderProviderFactory" \
   "$BUILD_DIR/classes/META-INF/services/"
# Any non-META-INF resource files (e.g. embedded inline logo PNG) get
# bundled at the same package path we reference via classpath lookup.
if [[ -d "$SRC_DIR/src/main/resources/com" ]]; then
  cp -R "$SRC_DIR/src/main/resources/com" "$BUILD_DIR/classes/"
fi
"$JAR_BIN" --create --file="$BUILD_DIR/$JAR_NAME" -C "$BUILD_DIR/classes" .

# ── Deploy ──
echo "→ deploy to $KC_PROVIDERS/"
install -m 0644 -o "$KC_USER" -g "$KC_GROUP" "$BUILD_DIR/$JAR_NAME" "$KC_PROVIDERS/$JAR_NAME"

# Clear KC's gzipped resource cache so the new classpath is visible.
if [[ -d "$KC_DIR/data/tmp/kc-gzip-cache" ]]; then
  echo "→ clear gzip cache"
  rm -rf "$KC_DIR/data/tmp/kc-gzip-cache"
fi

# ── kc.sh build (re-augments KC with provider classpath) ──
echo "→ kc.sh build"
sudo -u "$KC_USER" "$KC_DIR/bin/kc.sh" build 2>&1 | tail -20 || true

if [[ "$DO_RESTART" -eq 1 ]]; then
  echo "→ systemctl restart $KC_SERVICE"
  systemctl restart "$KC_SERVICE"
  for i in $(seq 1 15); do
    if curl -sf --max-time 3 "http://127.0.0.1:8180/realms/dogan/.well-known/openid-configuration" >/dev/null 2>&1; then
      echo "→ Keycloak ready after ${i}s"
      break
    fi
    sleep 1
  done
fi

echo "✓ Graph email sender installed at $KC_PROVIDERS/$JAR_NAME"
echo ""
echo "Quick verification:"
echo "  journalctl -u keycloak -n 50 --no-pager | grep -i graph"
echo "  (should show: 'token refreshed' + 'sent to=...' on next realm mail action)"
