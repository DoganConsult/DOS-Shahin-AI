-- Foundation Wave 02: Organization interaction contracts (DB-first).
-- Adds route-level filter/action tables and seeds organization route
-- interaction payloads for UI-OS template-binding resolver.
-- Idempotent, additive-only, no destructive operations.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.ui_route_filter (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  filter_id     TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  label_en      TEXT NOT NULL,
  label_ar      TEXT,
  field_key     TEXT NOT NULL,
  operator      TEXT NOT NULL DEFAULT 'eq',
  control       TEXT NOT NULL DEFAULT 'select',
  options_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_value TEXT,
  permission    TEXT,
  UNIQUE(route, filter_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_filter_route ON dos.ui_route_filter(route);

CREATE TABLE IF NOT EXISTS dos.ui_route_table_action (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  action_id     TEXT NOT NULL,
  scope         TEXT NOT NULL CHECK (scope IN ('toolbar', 'row', 'batch')),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  label_en      TEXT NOT NULL,
  label_ar      TEXT,
  action_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
  permission    TEXT,
  emphasis      TEXT,
  UNIQUE(route, action_id, scope)
);
CREATE INDEX IF NOT EXISTS ix_ui_route_table_action_route ON dos.ui_route_table_action(route);
CREATE INDEX IF NOT EXISTS ix_ui_route_table_action_scope ON dos.ui_route_table_action(scope);

WITH org_routes(route) AS (
  VALUES
    ('/foundation/organization'),
    ('/foundation/business-units'),
    ('/foundation/departments'),
    ('/foundation/positions'),
    ('/foundation/locations')
)
INSERT INTO dos.ui_route_filter (
  route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json, default_value, permission
)
SELECT route, 'status', 10, 'Status', 'الحالة', 'status', 'eq', 'select',
       '[{"value":"active","label":"Active"},{"value":"inactive","label":"Inactive"}]'::jsonb,
       'active', NULL
  FROM org_routes
ON CONFLICT (route, filter_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  field_key = EXCLUDED.field_key,
  operator = EXCLUDED.operator,
  control = EXCLUDED.control,
  options_json = EXCLUDED.options_json,
  default_value = EXCLUDED.default_value,
  permission = EXCLUDED.permission;

WITH org_routes(route) AS (
  VALUES
    ('/foundation/organization'),
    ('/foundation/business-units'),
    ('/foundation/departments'),
    ('/foundation/positions'),
    ('/foundation/locations')
)
INSERT INTO dos.ui_route_filter (
  route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json, default_value, permission
)
SELECT route, 'owner', 20, 'Owner', 'المالك', 'owner', 'eq', 'text_input', '[]'::jsonb, NULL, NULL
  FROM org_routes
ON CONFLICT (route, filter_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  field_key = EXCLUDED.field_key,
  operator = EXCLUDED.operator,
  control = EXCLUDED.control,
  options_json = EXCLUDED.options_json,
  default_value = EXCLUDED.default_value,
  permission = EXCLUDED.permission;

WITH org_routes(route) AS (
  VALUES
    ('/foundation/organization'),
    ('/foundation/business-units'),
    ('/foundation/departments'),
    ('/foundation/positions'),
    ('/foundation/locations')
)
INSERT INTO dos.ui_route_filter (
  route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json, default_value, permission
)
SELECT route, 'risk', 30, 'Risk level', 'مستوى المخاطر', 'riskLevel', 'in', 'multi_select',
       '[{"value":"critical","label":"Critical"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]'::jsonb,
       NULL, NULL
  FROM org_routes
ON CONFLICT (route, filter_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  field_key = EXCLUDED.field_key,
  operator = EXCLUDED.operator,
  control = EXCLUDED.control,
  options_json = EXCLUDED.options_json,
  default_value = EXCLUDED.default_value,
  permission = EXCLUDED.permission;

WITH org_routes(route) AS (
  VALUES
    ('/foundation/organization'),
    ('/foundation/business-units'),
    ('/foundation/departments'),
    ('/foundation/positions'),
    ('/foundation/locations')
)
INSERT INTO dos.ui_route_table_action (
  route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis
)
SELECT route, 'create', 'toolbar', 10, 'Create', 'إنشاء',
       jsonb_build_object('kind', 'dispatch_event', 'eventName', 'foundation.org.create'),
       NULL, 'primary'
  FROM org_routes
ON CONFLICT (route, action_id, scope) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  action_json = EXCLUDED.action_json,
  permission = EXCLUDED.permission,
  emphasis = EXCLUDED.emphasis;

WITH org_routes(route) AS (
  VALUES
    ('/foundation/organization'),
    ('/foundation/business-units'),
    ('/foundation/departments'),
    ('/foundation/positions'),
    ('/foundation/locations')
)
INSERT INTO dos.ui_route_table_action (
  route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis
)
SELECT route, 'assign-owner', 'batch', 20, 'Assign owner', 'تعيين مالك',
       jsonb_build_object('kind', 'dispatch_event', 'eventName', 'foundation.org.assign_owner'),
       NULL, 'secondary'
  FROM org_routes
ON CONFLICT (route, action_id, scope) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  action_json = EXCLUDED.action_json,
  permission = EXCLUDED.permission,
  emphasis = EXCLUDED.emphasis;

WITH org_routes(route) AS (
  VALUES
    ('/foundation/organization'),
    ('/foundation/business-units'),
    ('/foundation/departments'),
    ('/foundation/positions'),
    ('/foundation/locations')
)
INSERT INTO dos.ui_route_table_action (
  route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis
)
SELECT route, 'open-details', 'row', 30, 'Open details', 'عرض التفاصيل',
       jsonb_build_object('kind', 'open_context_tab', 'tab', 'record'),
       NULL, 'tertiary'
  FROM org_routes
ON CONFLICT (route, action_id, scope) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  action_json = EXCLUDED.action_json,
  permission = EXCLUDED.permission,
  emphasis = EXCLUDED.emphasis;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'dos'
       AND table_name = 'ui_route_filter'
  ) THEN
    RAISE EXCEPTION 'assertion failed: dos.ui_route_filter missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'dos'
       AND table_name = 'ui_route_table_action'
  ) THEN
    RAISE EXCEPTION 'assertion failed: dos.ui_route_table_action missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM dos.ui_route_filter WHERE route = '/foundation/organization' AND filter_id = 'status'
  ) THEN
    RAISE EXCEPTION 'assertion failed: organization status filter seed missing';
  END IF;
END $$;

COMMIT;
