#!/usr/bin/env bash
# Wave 20 — Multi-language SDK generation from openapi.yaml.
#
# Generates Python, Java, and Go SDKs using @openapitools/openapi-generator-cli.
# Each language SDK is committed as its own directory peer to typescript/.
#
# Usage:
#   ./codegen.sh [language|all]   # languages: typescript | python | java | go
#
# Output:
#   sdk/python/dos_compliance/   (Pip-installable: dos-compliance)
#   sdk/java/dos-compliance/     (Maven artifact: com.dos.compliance:sdk)
#   sdk/go/dos-compliance/       (Go module: github.com/dos-aio/sdk-compliance/go)
#
# typescript/ is hand-maintained for stability; codegen overwrites the others.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODULE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SPEC="$MODULE_ROOT/openapi.yaml"

if [[ ! -f "$SPEC" ]]; then
  echo "ERROR: spec not found at $SPEC" >&2
  exit 1
fi

LANG="${1:-all}"

GENERATOR="openapi-generator-cli"
if ! command -v "$GENERATOR" >/dev/null 2>&1; then
  echo "openapi-generator-cli not on PATH; using npx wrapper" >&2
  GENERATOR="npx --yes @openapitools/openapi-generator-cli@2.13.4"
fi

generate_python() {
  local out="$SCRIPT_DIR/python"
  mkdir -p "$out"
  $GENERATOR generate \
    -i "$SPEC" \
    -g python \
    -o "$out" \
    --package-name dos_compliance \
    --additional-properties=projectName=dos-compliance,packageVersion=0.1.0,library=urllib3
  echo "Python SDK → $out"
}

generate_java() {
  local out="$SCRIPT_DIR/java"
  mkdir -p "$out"
  $GENERATOR generate \
    -i "$SPEC" \
    -g java \
    -o "$out" \
    --api-package=com.dos.compliance.api \
    --model-package=com.dos.compliance.model \
    --invoker-package=com.dos.compliance \
    --additional-properties=groupId=com.dos.compliance,artifactId=sdk-compliance,artifactVersion=0.1.0,library=okhttp-gson
  echo "Java SDK → $out"
}

generate_go() {
  local out="$SCRIPT_DIR/go"
  mkdir -p "$out"
  $GENERATOR generate \
    -i "$SPEC" \
    -g go \
    -o "$out" \
    --git-user-id dos-aio \
    --git-repo-id sdk-compliance/go \
    --package-name doscompliance \
    --additional-properties=packageVersion=0.1.0,withGoMod=true
  echo "Go SDK → $out"
}

case "$LANG" in
  python) generate_python ;;
  java)   generate_java ;;
  go)     generate_go ;;
  typescript)
    echo "typescript SDK is hand-maintained at sdk/typescript/. Run 'cd sdk/typescript && tsc -p tsconfig.json' to rebuild." >&2
    ;;
  all)
    generate_python
    generate_java
    generate_go
    ;;
  *)
    echo "ERROR: unknown language: $LANG. Use python | java | go | typescript | all" >&2
    exit 2
    ;;
esac

echo "DONE."
