#!/usr/bin/env bash
# install-hook.sh — wire pre-commit + add npm scripts.
set -e
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo /root/DOS-Platform)"
HOOK="$ROOT/.git/hooks/pre-commit"
SRC="$ROOT/.modules-isolation/workspace/ci-gates/pre-commit"
mkdir -p "$ROOT/.git/hooks"
ln -sf "$SRC" "$HOOK"
echo "installed pre-commit hook -> $HOOK"
