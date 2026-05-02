#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Sprint 5 Import Rewrite Codemod
# Rewrites legacy @app/core/services/* and @app/services/* imports to use the
# canonical domain-cluster path aliases defined in tsconfig.json.
#
# Usage:
#   ./scripts/rewrite-imports.sh [--dry-run]   # Preview changes
#   ./scripts/rewrite-imports.sh               # Apply changes
#
# This is safe to run multiple times — sed patterns are idempotent.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

APP_DIR="$(cd "$(dirname "$0")/../src/app" && pwd)"
CHANGED=0

# ── Map: old import path fragment → new canonical path ──────────────────────
declare -A REWRITE_MAP

# Sprint 3: Infrastructure
REWRITE_MAP["@app/core/services/i18n.service"]="@app/infrastructure/i18n/i18n.service"
REWRITE_MAP["@app/core/services/storage.service"]="@app/infrastructure/storage/storage.service"
REWRITE_MAP["@app/core/services/global-error-handler.service"]="@app/infrastructure/error/global-error-handler.service"
REWRITE_MAP["@app/core/services/theme.service"]="@app/infrastructure/theme/theme.service"
REWRITE_MAP["@app/core/services/toast.service"]="@app/infrastructure/toast/toast.service"
REWRITE_MAP["@app/core/services/idle-timeout.service"]="@app/infrastructure/idle/idle-timeout.service"
REWRITE_MAP["@app/core/services/html-sanitizer.service"]="@app/infrastructure/sanitizer/html-sanitizer.service"
REWRITE_MAP["@app/core/services/scope-filter.service"]="@app/infrastructure/scope/scope-filter.service"
REWRITE_MAP["@app/core/services/connectivity.service"]="@app/infrastructure/connectivity/connectivity.service"
REWRITE_MAP["@app/core/services/entity-url-builder.service"]="@app/infrastructure/entity/entity-url-builder.service"
REWRITE_MAP["@app/core/services/severity.service"]="@app/infrastructure/entity/severity.service"
REWRITE_MAP["@app/core/services/site-context.service"]="@app/infrastructure/entity/site-context.service"

# Sprint 3 — also rewrite the @app/services/ shorthand alias
REWRITE_MAP["@app/services/i18n.service"]="@app/infrastructure/i18n/i18n.service"
REWRITE_MAP["@app/services/storage.service"]="@app/infrastructure/storage/storage.service"
REWRITE_MAP["@app/services/global-error-handler.service"]="@app/infrastructure/error/global-error-handler.service"
REWRITE_MAP["@app/services/theme.service"]="@app/infrastructure/theme/theme.service"
REWRITE_MAP["@app/services/toast.service"]="@app/infrastructure/toast/toast.service"
REWRITE_MAP["@app/services/idle-timeout.service"]="@app/infrastructure/idle/idle-timeout.service"
REWRITE_MAP["@app/services/html-sanitizer.service"]="@app/infrastructure/sanitizer/html-sanitizer.service"
REWRITE_MAP["@app/services/scope-filter.service"]="@app/infrastructure/scope/scope-filter.service"
REWRITE_MAP["@app/services/connectivity.service"]="@app/infrastructure/connectivity/connectivity.service"
REWRITE_MAP["@app/services/entity-url-builder.service"]="@app/infrastructure/entity/entity-url-builder.service"
REWRITE_MAP["@app/services/severity.service"]="@app/infrastructure/entity/severity.service"
REWRITE_MAP["@app/services/site-context.service"]="@app/infrastructure/entity/site-context.service"

# Sprint 4: Websocket
for svc in websocket-client websocket-notification ws-live-bridge ag-ui-websocket; do
  REWRITE_MAP["@app/core/services/${svc}.service"]="@app/websocket/${svc}.service"
  REWRITE_MAP["@app/services/${svc}.service"]="@app/websocket/${svc}.service"
done

# Sprint 4: Modules
for svc in journey module-kickstart module-readiness module-workflow module-crud-api sequencing-engine; do
  REWRITE_MAP["@app/core/services/${svc}.service"]="@app/modules/${svc}.service"
  REWRITE_MAP["@app/services/${svc}.service"]="@app/modules/${svc}.service"
done

# Sprint 4: GRC
for svc in grc grc-role grc-query-api foundation-data quick-grc-accelerator; do
  REWRITE_MAP["@app/core/services/${svc}.service"]="@app/grc/${svc}.service"
  REWRITE_MAP["@app/services/${svc}.service"]="@app/grc/${svc}.service"
done

# Sprint 4: Workspace
for svc in workspace-api workspace-collab-api dashboard-catalog dashboard-preferences collaboration-api; do
  REWRITE_MAP["@app/core/services/${svc}.service"]="@app/workspace/${svc}.service"
  REWRITE_MAP["@app/services/${svc}.service"]="@app/workspace/${svc}.service"
done

# Sprint 4: Reporting
for svc in reporting-api report-stream report-factory-catalog advanced-analytics chart-data; do
  REWRITE_MAP["@app/core/services/${svc}.service"]="@app/reporting/${svc}.service"
  REWRITE_MAP["@app/services/${svc}.service"]="@app/reporting/${svc}.service"
done

# Sprint 4: AI
for svc in ai-agent-api agent-health-api agent-audit-api local-knowledge-api ai-workflow-trigger unified-squad; do
  REWRITE_MAP["@app/core/services/${svc}.service"]="@app/ai/${svc}.service"
  REWRITE_MAP["@app/services/${svc}.service"]="@app/ai/${svc}.service"
done

# Sprint 4: Portals
for svc in vendor-portal regulator-portal consultant-center; do
  REWRITE_MAP["@app/core/services/${svc}.service"]="@app/portals/${svc}.service"
  REWRITE_MAP["@app/services/${svc}.service"]="@app/portals/${svc}.service"
done

# Sprint 4: Admin
for svc in platform-api platform-bootstrap platform-mode platform-stats admin-api admin-config-api admin-user-api mcp-admin-api; do
  REWRITE_MAP["@app/core/services/${svc}.service"]="@app/admin/${svc}.service"
  REWRITE_MAP["@app/services/${svc}.service"]="@app/admin/${svc}.service"
done

# Sprint 2: API stubs (already in core/services/api/ — rewrite to @app/api/)
for svc in bcp-api compliance-api evidence-api governance-api inbox-api incident-api issues-api \
           policy-api policy-impact-api privacy-api records-api risk-api risk-compliance-api \
           risk-smart-api team-api training-api vendor-api platform-evidence-api playbooks-api \
           knowledge-api ai-enhanced-api ai-governance-api; do
  REWRITE_MAP["@app/core/services/api/${svc}.service"]="@app/api/${svc}.service"
  REWRITE_MAP["@app/services/api/${svc}.service"]="@app/api/${svc}.service"
done

# ── Apply rewrites ──────────────────────────────────────────────────────────
echo "Sprint 5 Import Codemod — $([ "$DRY_RUN" = true ] && echo 'DRY RUN' || echo 'LIVE')"
echo "Rewriting ${#REWRITE_MAP[@]} import patterns..."
echo ""

for old in "${!REWRITE_MAP[@]}"; do
  new="${REWRITE_MAP[$old]}"
  
  # Find files containing the old import
  files=$(grep -rl "$old" "$APP_DIR" --include='*.ts' 2>/dev/null || true)
  if [ -z "$files" ]; then
    continue
  fi
  
  count=$(echo "$files" | wc -l)
  
  if [ "$DRY_RUN" = true ]; then
    echo "[DRY] $old → $new ($count files)"
  else
    echo "$files" | xargs sed -i "s|$old|$new|g"
    echo "[OK]  $old → $new ($count files)"
    CHANGED=$((CHANGED + count))
  fi
done

echo ""
echo "Done. $CHANGED file(s) rewritten."
echo ""
echo "Next steps:"
echo "  1. npx tsc --noEmit --project tsconfig.app.json  # verify zero errors"
echo "  2. git diff --stat                                # review changes"
echo "  3. Delete shim files once all imports are rewritten"
