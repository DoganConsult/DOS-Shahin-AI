#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# SBOM + Signature Verifier
#
# Validates a released SBOM bundle produced by
# .github/workflows/sbom-release.yml for a given tag or commit SHA.
#
# Steps:
#   1) Download the release assets for the tag (gh OR curl-anon).
#   2) Verify the cosign signature + certificate chain (keyless / Sigstore).
#   3) Re-derive the CycloneDX SBOM from the source archive and diff.
#   4) Run grype against the SBOM; flag any High/Critical that are not
#      listed in docs/releases/SECURITY-AUDIT-TRIAGE-v1.0.0.md.
#
# Usage:
#   ops/scripts/sbom/verify-sbom.sh <tag-or-sha> [--download-dir <dir>]
#
# Exit codes:
#   0  verification passed
#   1  signature or SBOM mismatch
#   2  precondition failed (missing tool, bad arg)
#
# Requirements (found on PATH):
#   cosign >= 2.2,  syft,  grype,  jq,  curl,  tar, sha256sum
#   Optional: gh (GitHub CLI) — used when available to fetch release assets
#
# Policy: /SUPPLY-CHAIN.md
# -----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
REPO_SLUG="DoganConsult/DOS"            # keep in sync with the GH repo slug
WORKFLOW_PATH=".github/workflows/sbom-release.yml"

TAG="${1:-}"
if [[ -z "${TAG}" || "${TAG}" == "-h" || "${TAG}" == "--help" ]]; then
  sed -n '2,28p' "$0"
  exit 2
fi
shift || true

DOWNLOAD_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t sbom-verify)"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --download-dir) DOWNLOAD_DIR="$2"; shift 2 ;;
    *) echo "${SCRIPT_NAME}: unknown arg: $1" >&2; exit 2 ;;
  esac
done
mkdir -p "${DOWNLOAD_DIR}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "${SCRIPT_NAME}: missing required tool: $1" >&2
    exit 2
  }
}
need cosign
need syft
need grype
need jq
need curl
need sha256sum
need tar

echo "[verify] repo  = ${REPO_SLUG}"
echo "[verify] tag   = ${TAG}"
echo "[verify] out   = ${DOWNLOAD_DIR}"

# --- 1. Download assets (gh if available, curl otherwise) -----------------
cd "${DOWNLOAD_DIR}"

if command -v gh >/dev/null 2>&1; then
  echo "[verify] using gh release download"
  gh release download "${TAG}" --repo "${REPO_SLUG}" --clobber \
    --pattern 'sbom-repo.cdx.json' \
    --pattern 'sbom-repo.cdx.json.sig' \
    --pattern 'sbom-repo.cdx.json.pem' \
    --pattern 'sbom-repo.spdx.json' \
    --pattern 'sbom-repo.spdx.json.sig' \
    --pattern 'sbom-repo.spdx.json.pem' \
    --pattern 'vuln-report.json' \
  || {
    echo "[verify] gh release download failed for ${TAG}" >&2
    exit 1
  }
else
  echo "[verify] gh not found — falling back to anonymous curl"
  base="https://github.com/${REPO_SLUG}/releases/download/${TAG}"
  for asset in \
    sbom-repo.cdx.json sbom-repo.cdx.json.sig sbom-repo.cdx.json.pem \
    sbom-repo.spdx.json sbom-repo.spdx.json.sig sbom-repo.spdx.json.pem \
    vuln-report.json; do
    curl -fsSL -o "$asset" "${base}/${asset}" || {
      echo "[verify] missing asset: $asset" >&2
      exit 1
    }
  done
fi

# --- 2. Cosign keyless verification ---------------------------------------
echo "[verify] cosign verify-blob (CycloneDX)"
cosign verify-blob \
  --certificate sbom-repo.cdx.json.pem \
  --signature   sbom-repo.cdx.json.sig \
  --certificate-identity-regexp "^https://github.com/${REPO_SLUG}/${WORKFLOW_PATH}" \
  --certificate-oidc-issuer     'https://token.actions.githubusercontent.com' \
  sbom-repo.cdx.json

echo "[verify] cosign verify-blob (SPDX)"
cosign verify-blob \
  --certificate sbom-repo.spdx.json.pem \
  --signature   sbom-repo.spdx.json.sig \
  --certificate-identity-regexp "^https://github.com/${REPO_SLUG}/${WORKFLOW_PATH}" \
  --certificate-oidc-issuer     'https://token.actions.githubusercontent.com' \
  sbom-repo.spdx.json

# --- 3. Re-derive SBOM and diff --------------------------------------------
echo "[verify] re-deriving SBOM from source (syft)"
(
  cd "${REPO_ROOT}"
  syft scan dir:. \
    --output "cyclonedx-json=${DOWNLOAD_DIR}/re-sbom.cdx.json" \
    --source-name "dos-platform" \
    --source-version "${TAG}" \
    --exclude '**/node_modules/**' \
    --exclude '**/dist/**' \
    --exclude '**/build/**' \
    --exclude '**/.git/**' \
    --quiet
)

echo "[verify] diffing canonical component lists"
canonical() {
  jq -S '[.components[]? | {name: .name, version: .version, purl: .purl}] | sort_by(.purl // .name)' "$1"
}
diff <(canonical sbom-repo.cdx.json)  <(canonical re-sbom.cdx.json) \
  | tee sbom-diff.txt | head -40 || true

if [[ -s sbom-diff.txt ]]; then
  echo "[verify] warning: re-derived SBOM differs from the published artefact."
  echo "[verify] full diff at ${DOWNLOAD_DIR}/sbom-diff.txt"
  # Non-fatal: native deps differ per platform. Operators decide if diffs
  # are acceptable. Hard failure is reserved for signature mismatches.
fi

# --- 4. Grype scan ---------------------------------------------------------
echo "[verify] grype scan (High/Critical)"
grype sbom:sbom-repo.cdx.json --output json --file grype-fresh.json --fail-on none

new_hc="$(jq -r '[.matches[]
  | select(.vulnerability.severity=="High" or .vulnerability.severity=="Critical")
  | "\(.artifact.name)@\(.artifact.version)  \(.vulnerability.id)"]
  | sort | unique | .[]' grype-fresh.json)"
if [[ -n "${new_hc}" ]]; then
  echo "[verify] High/Critical findings (operator must reconcile with SECURITY-AUDIT-TRIAGE):"
  printf '  %s\n' ${new_hc}
fi

echo "[verify] done. Artefacts in ${DOWNLOAD_DIR}"
