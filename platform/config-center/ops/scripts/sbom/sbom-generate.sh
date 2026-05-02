#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Local SBOM generator — developer convenience wrapper around syft + grype.
#
# Produces, in ./_sbom-out/:
#   - dos-<sha>.cdx.json    CycloneDX 1.5 JSON (repo-wide)
#   - dos-<sha>.spdx.json   SPDX 2.3 JSON      (repo-wide)
#   - dos-<sha>.grype.json  Vulnerability scan against the CycloneDX SBOM
#
# Usage:
#   ops/scripts/sbom/sbom-generate.sh [--scope <dir>] [--fail-on <sev>]
#
# Examples:
#   ops/scripts/sbom/sbom-generate.sh
#   ops/scripts/sbom/sbom-generate.sh --scope services/gateway
#   ops/scripts/sbom/sbom-generate.sh --scope packages/dos-auth --fail-on high
#
# Requirements (found on PATH):
#   - syft  >= 1.15
#   - grype >= 0.80
#   - git
#   - jq    (only if --fail-on is used)
#
# Policy: /SUPPLY-CHAIN.md
# -----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
OUT_DIR="${REPO_ROOT}/_sbom-out"

SCOPE="."
FAIL_ON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="$2"; shift 2 ;;
    --fail-on)
      FAIL_ON="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,20p' "$0"; exit 0 ;;
    *)
      echo "${SCRIPT_NAME}: unknown arg: $1" >&2
      exit 2 ;;
  esac
done

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "${SCRIPT_NAME}: missing required tool: $1" >&2
    exit 2
  }
}
need syft
need grype
need git

mkdir -p "${OUT_DIR}"

SHA="$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo unknown)"
TAG="$(git -C "${REPO_ROOT}" describe --tags --always 2>/dev/null || echo untagged)"
SLUG="$(echo "${SCOPE}" | tr '/.' '__')"
STAMP="${SLUG}-${SHA}"

echo "[sbom] repo = ${REPO_ROOT}"
echo "[sbom] scope = ${SCOPE}"
echo "[sbom] tag  = ${TAG}   sha = ${SHA}"
echo "[sbom] out  = ${OUT_DIR}"

cd "${REPO_ROOT}"

# -- CycloneDX --------------------------------------------------------------
echo "[sbom] generating CycloneDX ..."
syft scan "dir:${SCOPE}" \
  --output "cyclonedx-json=${OUT_DIR}/${STAMP}.cdx.json" \
  --source-name "dos-${SLUG}" \
  --source-version "${TAG}" \
  --exclude '**/node_modules/**' \
  --exclude '**/dist/**' \
  --exclude '**/build/**' \
  --exclude '**/.git/**' \
  --quiet

# -- SPDX -------------------------------------------------------------------
echo "[sbom] generating SPDX ..."
syft scan "dir:${SCOPE}" \
  --output "spdx-json=${OUT_DIR}/${STAMP}.spdx.json" \
  --source-name "dos-${SLUG}" \
  --source-version "${TAG}" \
  --exclude '**/node_modules/**' \
  --exclude '**/dist/**' \
  --exclude '**/build/**' \
  --exclude '**/.git/**' \
  --quiet

# -- Vuln scan --------------------------------------------------------------
echo "[sbom] running grype ..."
grype "sbom:${OUT_DIR}/${STAMP}.cdx.json" \
  --output json \
  --file "${OUT_DIR}/${STAMP}.grype.json" \
  --fail-on "${FAIL_ON:-none}"

# -- Summary ----------------------------------------------------------------
if command -v jq >/dev/null 2>&1; then
  total=$(jq '.matches | length' "${OUT_DIR}/${STAMP}.grype.json")
  crit=$(jq '[.matches[] | select(.vulnerability.severity=="Critical")] | length' "${OUT_DIR}/${STAMP}.grype.json")
  high=$(jq '[.matches[] | select(.vulnerability.severity=="High")] | length' "${OUT_DIR}/${STAMP}.grype.json")
  med=$(jq  '[.matches[] | select(.vulnerability.severity=="Medium")] | length' "${OUT_DIR}/${STAMP}.grype.json")
  low=$(jq  '[.matches[] | select(.vulnerability.severity=="Low")] | length' "${OUT_DIR}/${STAMP}.grype.json")
  printf "[sbom] findings: total=%s  critical=%s  high=%s  medium=%s  low=%s\n" \
    "${total}" "${crit}" "${high}" "${med}" "${low}"
fi

printf "[sbom] done — outputs:\n  %s.cdx.json\n  %s.spdx.json\n  %s.grype.json\n" \
  "${OUT_DIR}/${STAMP}" "${OUT_DIR}/${STAMP}" "${OUT_DIR}/${STAMP}"
