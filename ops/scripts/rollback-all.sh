#!/bin/bash
# Rollback ALL services to a given commit
# Usage: ./rollback-all.sh <commit-sha>

set -e

COMMIT_SHA=$1

if [ -z "$COMMIT_SHA" ]; then
  echo "Usage: $0 <commit-sha>"
  exit 1
fi

echo "═══ Rolling Back All Services to $COMMIT_SHA ═══"

# Git rollback
echo "Rolling back git to $COMMIT_SHA..."
git reset --hard "$COMMIT_SHA"

# Rebuild packages
echo "Rebuilding packages..."
pnpm install
pnpm run build:packages

# Rebuild services
echo "Rebuilding services..."
pnpm run build:services

# Restart services (adjust based on your deployment)
echo "Restarting services..."
# Add your service restart commands here
# Example: systemctl restart gateway auth-service tenant-service ...

echo "✓ Rollback complete to $COMMIT_SHA"
