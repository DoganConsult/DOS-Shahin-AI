#!/usr/bin/env bash
set -euo pipefail
PROFILE="${1:-grc}"; MODULE="${2:-}"
[ -n "$MODULE" ] || { echo "usage: $0 <profile> <module>"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROF="$ROOT/profiles/$PROFILE"
MAN="$PROF/manifests/$MODULE.profile.json"
[ -f "$MAN" ] || { echo "no manifest $MAN"; exit 1; }
OUT="$PROF/enrolment/$MODULE"
mkdir -p "$OUT"

TIER="module"
CARD_POS=$(jq -r '.card_position' "$MAN")
NAME=$(jq -r '.name' "$MAN")
PRODUCT_KEY="shahin-ai"
ENT_KEY="module.$MODULE"
Q=$'\047'   # single quote

# 1. module_registry
cat > "$OUT/01_module_registry.sql" <<SQL
BEGIN;
INSERT INTO dos.module_registry
  (profile_code, module_code, tier, product_key, card_position, entitlement_key, feature_flag, enabled, metadata)
VALUES
  ('$PROFILE','$MODULE','$TIER','$PRODUCT_KEY',$CARD_POS,'$ENT_KEY','$ENT_KEY.enabled',TRUE,
   jsonb_build_object('name','$NAME'))
ON CONFLICT (profile_code, module_code) DO UPDATE
  SET tier=EXCLUDED.tier, card_position=EXCLUDED.card_position, enabled=EXCLUDED.enabled;

UPDATE dos.ui_module SET tier='$TIER' WHERE profile_code='$PROFILE' AND code='$MODULE';
COMMIT;
SQL

# 2. tenant entitlement
if [ "$TIER" = "dna" ]; then
  cat > "$OUT/02_tenant_entitlement.sql" <<SQL
-- DNA tier: $MODULE is unconditional.
BEGIN;
INSERT INTO dos.tenant_product_activation (tenant_id, product_key, status)
  SELECT tenant_id, '$PRODUCT_KEY', 'active' FROM dos.tenant_profile
  ON CONFLICT (tenant_id, product_key) DO NOTHING;
COMMIT;
SQL
else
  cat > "$OUT/02_tenant_entitlement.sql" <<SQL
BEGIN;
INSERT INTO dos.tenant_product_activation (tenant_id, product_key, status)
  SELECT tenant_id, '$PRODUCT_KEY', 'active' FROM dos.tenant_profile
  ON CONFLICT (tenant_id, product_key) DO NOTHING;

INSERT INTO dos.tenant_module_entitlements (tenant_id, profile_code, module_code, status, limits)
  SELECT tenant_id, '$PROFILE', '$MODULE', 'active', '{}'::jsonb
  FROM dos.tenant_profile WHERE profile_code = '$PROFILE'
  ON CONFLICT (tenant_id, profile_code, module_code) DO NOTHING;
COMMIT;
SQL
fi

# 3. permissions sql
{
  echo "-- Project permissions for module=$MODULE"
  echo "BEGIN;"
  ROWS=$(jq -r --arg m "$MODULE" \
    '.permissions[] | select(.module==$m) | "  (\u0027" + .code + "\u0027,\u0027" + .module + "\u0027,\u0027" + .verb + "\u0027),"' \
    "$PROF/registries/permissions.registry.json")
  if [ -z "$ROWS" ]; then
    echo "-- (no permissions for $MODULE)"
  else
    echo "INSERT INTO permissions (code, module_code, verb) VALUES"
    echo "$ROWS" | sed '$ s/,$/;/'
  fi
  echo "COMMIT;"
} > "$OUT/03_permissions.sql"

# 4. role_permissions
{
  echo "-- Project role + role_permissions for module=$MODULE"
  echo "BEGIN;"
  for tmpl in executive_owner module_lead approver contributor viewer; do
    echo "INSERT INTO roles (code, module_code, template) VALUES (${Q}$MODULE.$tmpl${Q},${Q}$MODULE${Q},${Q}$tmpl${Q}) ON CONFLICT (code) DO NOTHING;"
  done
  jq -r --arg m "$MODULE" '
    .roles | to_entries[] |
    .key as $tmpl | .value.permissions[]? |
    "INSERT INTO role_permissions (role_code, permission_code) VALUES (\u0027" + $m + "." + $tmpl + "\u0027,\u0027" + $m + "." + . + "\u0027) ON CONFLICT DO NOTHING;"
  ' "$MAN"
  echo "COMMIT;"
} > "$OUT/04_role_permissions.sql"

# 5. routes.json
MOD_PASCAL=$(echo "$MODULE" | awk -F_ '{ for (i=1;i<=NF;i++) printf("%s%s", toupper(substr($i,1,1)), substr($i,2)); print "" }')
cat > "$OUT/routes.json" <<JSON
{
  "module": "$MODULE",
  "tier": "$TIER",
  "loadChildren": "modules/cards/$MODULE/sources/$MODULE.module#${MOD_PASCAL}Module",
  "routes": [
    { "path": "$MODULE",           "view_kind": "list",      "required_permission": "$MODULE.record.read" },
    { "path": "$MODULE/dashboard", "view_kind": "dashboard", "required_permission": "$MODULE.record.read" },
    { "path": "$MODULE/new",       "view_kind": "form",      "required_permission": "$MODULE.record.write" },
    { "path": "$MODULE/:id",       "view_kind": "detail",    "required_permission": "$MODULE.record.read" },
    { "path": "$MODULE/settings",  "view_kind": "settings",  "required_permission": "$MODULE.record.configure" }
  ]
}
JSON


# 6. dynamic_ui_component_registry (Carbon contract coherence)
MOD_PASCAL=$(echo "$MODULE" | awk -F_ '{ for (i=1;i<=NF;i++) printf("%s%s", toupper(substr($i,1,1)), substr($i,2)); print "" }')
cat > "$OUT/05_component_registry.sql" <<SQL
-- Carbon contract coherence: register one approved component per route.
-- Each row is gated by the trigger trg_carbon_only_runtime — vendor must be
-- ibm-carbon, approval_status must be approved, carbon_key must FK into
-- dos.ui_carbon_components.
BEGIN;
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('${MOD_PASCAL}ListPage',      'ibm-carbon','approved','table',           '1', jsonb_build_object('module','$MODULE','kind','list','profile','$PROFILE')),
  ('${MOD_PASCAL}DetailPage',    'ibm-carbon','approved','table',           '1', jsonb_build_object('module','$MODULE','kind','detail','profile','$PROFILE')),
  ('${MOD_PASCAL}FormPage',      'ibm-carbon','approved','tiles',           '1', jsonb_build_object('module','$MODULE','kind','form','profile','$PROFILE')),
  ('${MOD_PASCAL}DashboardPage', 'ibm-carbon','approved','tiles',           '1', jsonb_build_object('module','$MODULE','kind','dashboard','profile','$PROFILE')),
  ('${MOD_PASCAL}SettingsPage',  'ibm-carbon','approved','structured-list', '1', jsonb_build_object('module','$MODULE','kind','settings','profile','$PROFILE'))
ON CONFLICT (component_key) DO UPDATE
   SET vendor=EXCLUDED.vendor,
       approval_status=EXCLUDED.approval_status,
       carbon_key=EXCLUDED.carbon_key,
       schema_version=EXCLUDED.schema_version,
       metadata=EXCLUDED.metadata;
COMMIT;
SQL

echo "enrolled $PROFILE/$MODULE -> $OUT"
