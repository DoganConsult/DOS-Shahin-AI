#!/usr/bin/env bash
# Prefer a Node binary that satisfies repo engines (package.json engines.node),
# because IDE/Cursor terminals often put a bundled Node earlier on PATH.
set -euo pipefail

# Put `dir` at the front of PATH even if it already appears later (IDE shims often win otherwise).
force_path_prefix() {
  local dir="$1"
  if [[ -z "$dir" || ! -d "$dir" ]]; then
    return 0
  fi
  local filtered=""
  local part
  IFS=':' read -r -a _parts <<< "${PATH:-}"
  for part in "${_parts[@]}"; do
    [[ -z "$part" ]] && continue
    [[ "$part" == "$dir" ]] && continue
    if [[ -z "$filtered" ]]; then
      filtered="$part"
    else
      filtered="${filtered}:${part}"
    fi
  done
  export PATH="${dir}:${filtered}"
}

if [[ -n "${NODE_BINARY:-}" && -x "${NODE_BINARY}" ]]; then
  force_path_prefix "$(dirname "${NODE_BINARY}")"
fi

# Typical Linux (NodeSource) / local installs — checked before generic `command -v`.
for candidate in /usr/bin/node /usr/local/bin/node /opt/homebrew/bin/node; do
  if [[ -x "$candidate" ]]; then
    force_path_prefix "$(dirname "$candidate")"
    break
  fi
done

if ! command -v node >/dev/null 2>&1; then
  echo "with-engine-node: no node found on PATH" >&2
  exit 127
fi

node - <<'NODE' >&2 || exit 1
const wanted = [24, 14, 0];
const m = /^v(\d+)\.(\d+)\.(\d+)/.exec(process.version);
if (!m) {
  console.error(`with-engine-node: unparseable process.version=${process.version}`);
  process.exit(1);
}
const got = [Number(m[1]), Number(m[2]), Number(m[3])];
const ok =
  got[0] > wanted[0] ||
  (got[0] === wanted[0] && got[1] > wanted[1]) ||
  (got[0] === wanted[0] && got[1] === wanted[1] && got[2] >= wanted[2]);
if (!ok) {
  console.error(
    `with-engine-node: need Node >= ${wanted.join('.')} (see package.json engines); got ${process.version}. ` +
      `Set NODE_BINARY to a compliant node or put it earlier on PATH (e.g. export PATH="/usr/bin:$PATH").`
  );
  process.exit(1);
}
console.error(`with-engine-node: using ${process.execPath} (${process.version})`);
NODE

exec "$@"
