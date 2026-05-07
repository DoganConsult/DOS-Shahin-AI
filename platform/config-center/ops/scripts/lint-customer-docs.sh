#!/usr/bin/env bash
# Customer-doc language lint — closes Phase 12G P2-07.
set -uo pipefail

show_help() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Scans customer-facing release docs for forbidden vocabulary.

Options:
  --help, -h           Show this help message

Policy:
  Scans Tier-A customer-facing release docs for vocabulary forbidden by owner brief.
  Exits non-zero on first finding.

See docs/releases/RELEASE-DOCS-POLICY.md for full policy.

Examples:
  # Lint customer docs
  $(basename "$0)
EOF
  exit 0
}

for arg in "$@"; do
  case "$arg" in --help|-h) show_help ;; esac
done

FILES=(
  "docs/releases/COMMERCIAL-RELEASE-SHAHIN-v1.0.0.md"
  "docs/releases/CUSTOMER-FACING-CAPABILITIES.md"
  "docs/releases/KNOWN-NOT-ENABLED-MODULES.md"
)

# Whole-word / word-boundary matches. Case-insensitive. Each entry is
# a Perl regex the script pushes through `grep -P`.
FORBIDDEN=(
  "Wave-1"
  "Wave 1"
  "\\bslice\\b"
  "\\bMVP\\b"
  "\\bpartial\\b"
  "hidden broken"
  "\\bworkaround\\b"
  "\\btemporary\\b"
  "\\bbroken\\b"
)

total_hits=0
for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "MISSING $f"
    total_hits=$((total_hits + 1))
    continue
  fi
  file_hits=0
  for pat in "${FORBIDDEN[@]}"; do
    matches=$(grep -niP "$pat" "$f" 2>/dev/null || true)
    if [ -n "$matches" ]; then
      if [ $file_hits -eq 0 ]; then
        echo "---"
        echo "FAIL $f"
      fi
      echo "  '$pat' →"
      echo "$matches" | sed 's/^/    /'
      file_hits=$((file_hits + 1))
    fi
  done
  total_hits=$((total_hits + file_hits))
  if [ $file_hits -eq 0 ]; then
    echo "OK   $f"
  fi
done

echo
if [ $total_hits -eq 0 ]; then
  echo "PASS — all Tier-A customer-facing docs use approved vocabulary."
  exit 0
fi
echo "FAIL — $total_hits forbidden-vocabulary hits across customer docs."
exit 1
