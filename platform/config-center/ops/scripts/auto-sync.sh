#!/bin/bash
# Auto-sync watcher: commits & pushes any change in the repo, with a
# build-freshness gate so src/dist drift never makes it into a commit.
#
# Why the gate:
#   pm2 runs services from dist/*.js. If src/ is committed without a
#   matching dist/ rebuild, pm2 hits stale compiled code with renamed
#   packages / deleted modules and crash-loops. The canonical symptom
#   was the `@dos/auth` → `@dos/dauth-shared` rename after the DAuth
#   extraction: src updated, dist not rebuilt, every service MODULE_NOT_FOUND.
#   See docs/auth-host-runtime-ops.md §8.
#
# Behavior:
#   1. Watch the repo (inotify), debounce to 10s.
#   2. Before committing, detect TS workspaces whose src/*.ts is newer
#      than the newest dist/*.js (or whose dist is missing entirely).
#   3. Rebuild just those workspaces in parallel via pnpm --filter.
#   4. If any rebuild fails: log loudly, SKIP the commit (preserve WIP
#      in the working tree so the author sees the breakage).
#   5. On success: commit (regenerated dist included) + push.
#
# Flags:
#   --dry-run    Print what would be rebuilt/committed without acting.
#                Useful for CI or manual audit.
#   --once       Run one pass and exit (skip the watch loop).

set -u
REPO="/root/DOS-AIO"
DEBOUNCE=10
DRY_RUN=0
ONCE=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --once)    ONCE=1 ;;
  esac
done

cd "$REPO" || exit 1

log() { echo "[auto-sync] $*"; }

# Map a file path to the TS workspace directory that owns it.
# Returns empty if the file is not inside a workspace (e.g. top-level docs).
resolve_workspace() {
  local path="$1"
  case "$path" in
    services/*)
      echo "services/$(echo "$path" | cut -d/ -f2)"
      ;;
    packages/*)
      echo "packages/$(echo "$path" | cut -d/ -f2)"
      ;;
    platform/*/services/*)
      echo "platform/$(echo "$path" | cut -d/ -f2)/services/$(echo "$path" | cut -d/ -f4)"
      ;;
    platform/*/packages/*)
      echo "platform/$(echo "$path" | cut -d/ -f2)/packages/$(echo "$path" | cut -d/ -f4)"
      ;;
    *)
      echo ""
      ;;
  esac
}

# Does the workspace have a `build` npm script?
has_build_script() {
  local ws="$1"
  [ -f "$REPO/$ws/package.json" ] || return 1
  node -e "
    const p = require('$REPO/$ws/package.json');
    process.exit(p.scripts && p.scripts.build ? 0 : 1);
  " 2>/dev/null
}

# Read the pnpm workspace name (e.g. @dos/gateway) from package.json.
workspace_name() {
  local ws="$1"
  node -e "console.log(require('$REPO/$ws/package.json').name)" 2>/dev/null
}

# True if src newer than dist. Both conditions count as "stale":
#   - dist/ does not exist
#   - newest src/*.ts mtime > newest dist/*.js mtime
needs_rebuild() {
  local ws="$1"
  [ -d "$REPO/$ws/src" ] || return 1
  if [ ! -d "$REPO/$ws/dist" ]; then
    return 0
  fi
  local src_newest dist_newest
  src_newest=$(find "$REPO/$ws/src" -name '*.ts' -not -name '*.test.ts' -not -name '*.spec.ts' -printf '%T@\n' 2>/dev/null | sort -rn | head -1)
  dist_newest=$(find "$REPO/$ws/dist" -name '*.js' -printf '%T@\n' 2>/dev/null | sort -rn | head -1)
  [ -z "$dist_newest" ] && return 0
  [ -z "$src_newest" ] && return 1
  awk -v s="$src_newest" -v d="$dist_newest" 'BEGIN { exit !(s > d) }'
}

# Collect stale workspaces touched by pending changes.
collect_stale_workspaces() {
  local changed
  changed=$( { git diff --name-only; git diff --name-only --cached; git ls-files --others --exclude-standard; } | sort -u )
  [ -z "$changed" ] && return 0

  local seen=" "
  while IFS= read -r f; do
    local ws
    ws=$(resolve_workspace "$f")
    [ -z "$ws" ] && continue
    [[ "$seen" == *" $ws "* ]] && continue
    seen="$seen$ws "
    if has_build_script "$ws" && needs_rebuild "$ws"; then
      echo "$ws"
    fi
  done <<< "$changed"
}

# Rebuild the given workspaces in parallel via pnpm filters.
rebuild_workspaces() {
  local workspaces=("$@")
  [ ${#workspaces[@]} -eq 0 ] && return 0

  local filters=()
  for ws in "${workspaces[@]}"; do
    local name
    name=$(workspace_name "$ws")
    [ -n "$name" ] && filters+=("--filter" "$name")
  done
  [ ${#filters[@]} -eq 0 ] && return 0

  log "rebuilding ${#workspaces[@]} workspace(s): ${workspaces[*]}"
  if [ "$DRY_RUN" = "1" ]; then
    log "DRY-RUN: pnpm ${filters[*]} run build"
    return 0
  fi
  (cd "$REPO" && pnpm "${filters[@]}" run build) 2>&1 | tail -20
  return "${PIPESTATUS[0]}"
}

# One sync pass: gate, commit, push.
sync_once() {
  cd "$REPO" || return 1
  if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    return 0
  fi

  local stale
  stale=$(collect_stale_workspaces)
  if [ -n "$stale" ]; then
    local ws_array=()
    while IFS= read -r line; do ws_array+=("$line"); done <<< "$stale"
    if ! rebuild_workspaces "${ws_array[@]}"; then
      log "ERROR: rebuild failed — skipping commit to preserve working tree"
      return 2
    fi
  fi

  if [ "$DRY_RUN" = "1" ]; then
    log "DRY-RUN: would commit+push"
    return 0
  fi
  git add -A
  git -c user.name="auto-sync" -c user.email="auto-sync@dos-aio.local" \
    commit -m "chore(auto-sync): $(date -Iseconds)" >/dev/null 2>&1 \
    && git push origin HEAD >/dev/null 2>&1 \
    && log "pushed @ $(date -Iseconds)"
}

if [ "$ONCE" = "1" ]; then
  sync_once
  exit $?
fi

log "watching $REPO (debounce ${DEBOUNCE}s, dry-run=$DRY_RUN)"
while true; do
  inotifywait -qr -e modify,create,delete,move \
    --exclude '(\.git/|node_modules/|dist/|\.cache/|\.turbo/|coverage/|\.next/|\.angular/)' \
    "$REPO" >/dev/null
  sleep "$DEBOUNCE"
  sync_once || true
done
