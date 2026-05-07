-- 20260511_1240_foundation_partial_route_depth_backfill.sql
--
-- Backfills partial Foundation routes with typed interaction datasets and
-- creates missing resolver extension tables referenced by template-binding.

BEGIN;

CREATE TABLE IF NOT EXISTS dos.ui_route_record_row (
  route        text NOT NULL,
  row_id       text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 100,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity     text,
  status       text,
  PRIMARY KEY (route, row_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_route_record_field (
  route        text NOT NULL,
  field_id     text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 100,
  label_en     text NOT NULL,
  label_ar     text NOT NULL,
  value        text,
  kind         text,
  PRIMARY KEY (route, field_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_route_posture_score (
  route        text NOT NULL,
  score_id     text NOT NULL,
  kind         text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 100,
  label_en     text NOT NULL,
  label_ar     text NOT NULL,
  value        numeric NOT NULL DEFAULT 0,
  max_value    numeric,
  severity     text,
  status       text,
  PRIMARY KEY (route, score_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_route_trend_series (
  route        text NOT NULL,
  series_id    text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 100,
  name_en      text NOT NULL,
  name_ar      text NOT NULL,
  color        text,
  points       jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (route, series_id)
);

CREATE TABLE IF NOT EXISTS dos.ui_route_ai_insight (
  route        text NOT NULL,
  insight_id   text NOT NULL,
  sort_order   integer NOT NULL DEFAULT 100,
  text_en      text NOT NULL,
  text_ar      text NOT NULL,
  severity     text,
  action       jsonb,
  PRIMARY KEY (route, insight_id)
);

WITH target_routes(route) AS (
  VALUES
    ('/foundation/positions'),
    ('/foundation/locations'),
    ('/foundation/records'),
    ('/foundation/committees'),
    ('/foundation/policies')
)
DELETE FROM dos.ui_route_filter f
USING target_routes t
WHERE f.route = t.route
  AND f.filter_id IN ('status', 'owner');

WITH target_routes(route) AS (
  VALUES
    ('/foundation/positions'),
    ('/foundation/locations'),
    ('/foundation/records'),
    ('/foundation/committees'),
    ('/foundation/policies')
)
INSERT INTO dos.ui_route_filter (
  route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json, default_value, permission
)
SELECT route, 'status', 10, 'Status', 'الحالة', 'status', 'eq', 'select',
       '[{"value":"active","label":"Active"},{"value":"draft","label":"Draft"},{"value":"review","label":"In Review"}]'::jsonb,
       'active', NULL
FROM target_routes
UNION ALL
SELECT route, 'owner', 20, 'Owner', 'المالك', 'owner', 'eq', 'select',
       '[{"value":"iam","label":"IAM"},{"value":"governance","label":"Governance"},{"value":"risk","label":"Risk"}]'::jsonb,
       NULL, NULL
FROM target_routes;

WITH target_routes(route) AS (
  VALUES
    ('/foundation/positions'),
    ('/foundation/locations'),
    ('/foundation/records'),
    ('/foundation/committees'),
    ('/foundation/policies')
)
DELETE FROM dos.ui_route_column c
USING target_routes t
WHERE c.route = t.route
  AND c.field_key IN ('title', 'owner', 'status');

WITH target_routes(route) AS (
  VALUES
    ('/foundation/positions'),
    ('/foundation/locations'),
    ('/foundation/records'),
    ('/foundation/committees'),
    ('/foundation/policies')
)
INSERT INTO dos.ui_route_column (
  route, sort_order, field_key, label_en, label_ar, type, sortable
)
SELECT route, 10, 'title', 'Title', 'العنوان', 'text', true FROM target_routes
UNION ALL
SELECT route, 20, 'owner', 'Owner', 'المالك', 'text', true FROM target_routes
UNION ALL
SELECT route, 30, 'status', 'Status', 'الحالة', 'status', true FROM target_routes;

WITH target_routes(route) AS (
  VALUES
    ('/foundation/positions'),
    ('/foundation/locations'),
    ('/foundation/records'),
    ('/foundation/committees'),
    ('/foundation/policies')
)
DELETE FROM dos.ui_route_table_action a
USING target_routes t
WHERE a.route = t.route
  AND a.action_id IN ('create', 'open-details', 'export-evidence');

WITH target_routes(route) AS (
  VALUES
    ('/foundation/positions'),
    ('/foundation/locations'),
    ('/foundation/records'),
    ('/foundation/committees'),
    ('/foundation/policies')
)
INSERT INTO dos.ui_route_table_action (
  route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis
)
SELECT route, 'create', 'toolbar', 10, 'Create', 'إنشاء',
       jsonb_build_object('kind', 'dispatch_event', 'eventName', 'foundation.partial.create'),
       NULL, 'primary'
FROM target_routes
UNION ALL
SELECT route, 'open-details', 'row', 20, 'Open details', 'فتح التفاصيل',
       jsonb_build_object('kind', 'dispatch_event', 'eventName', 'foundation.partial.open-details'),
       NULL, 'secondary'
FROM target_routes
UNION ALL
SELECT route, 'export-evidence', 'batch', 30, 'Export evidence', 'تصدير الأدلة',
       jsonb_build_object('kind', 'dispatch_event', 'eventName', 'foundation.partial.export-evidence'),
       NULL, 'ghost'
FROM target_routes;

WITH target_routes(route, route_code) AS (
  VALUES
    ('/foundation/positions', 'positions'),
    ('/foundation/locations', 'locations'),
    ('/foundation/records', 'records'),
    ('/foundation/committees', 'committees'),
    ('/foundation/policies', 'policies')
)
DELETE FROM dos.ui_route_record_row r
USING target_routes t
WHERE r.route = t.route
  AND r.row_id IN ('seed-01', 'seed-02');

WITH target_routes(route, route_code) AS (
  VALUES
    ('/foundation/positions', 'positions'),
    ('/foundation/locations', 'locations'),
    ('/foundation/records', 'records'),
    ('/foundation/committees', 'committees'),
    ('/foundation/policies', 'policies')
)
INSERT INTO dos.ui_route_record_row (
  route, row_id, sort_order, payload, severity, status
)
SELECT
  route,
  'seed-01',
  10,
  jsonb_build_object(
    'title', initcap(route_code) || ' baseline contract',
    'owner', 'iam',
    'status', 'active',
    'evidenceRef', upper(route_code) || '-EVID-001'
  ),
  'low',
  'active'
FROM target_routes
UNION ALL
SELECT
  route,
  'seed-02',
  20,
  jsonb_build_object(
    'title', initcap(route_code) || ' remediation queue',
    'owner', 'governance',
    'status', 'review',
    'evidenceRef', upper(route_code) || '-EVID-002'
  ),
  'medium',
  'review'
FROM target_routes;

DELETE FROM dos.ui_route_setting_section
WHERE route IN ('/foundation/settings', '/foundation/sod')
  AND section_id IN ('access-governance', 'lifecycle-policy', 'sod-policy');

INSERT INTO dos.ui_route_setting_section (
  route, section_id, sort_order, label_en, label_ar, icon
)
VALUES
  ('/foundation/settings', 'access-governance', 10, 'Access governance', 'حوكمة الوصول', 'settings'),
  ('/foundation/settings', 'lifecycle-policy', 20, 'Lifecycle policy', 'سياسة دورة الحياة', 'time'),
  ('/foundation/sod', 'sod-policy', 10, 'SoD policy controls', 'ضوابط فصل الواجبات', 'warning');

DELETE FROM dos.ui_route_tab
WHERE route IN ('/foundation/settings', '/foundation/sod')
  AND tab_id IN ('policy', 'approvals', 'evidence', 'violations');

INSERT INTO dos.ui_route_tab (
  route, tab_id, sort_order, label_en, label_ar, permission
)
VALUES
  ('/foundation/settings', 'policy', 10, 'Policy', 'السياسة', NULL),
  ('/foundation/settings', 'approvals', 20, 'Approvals', 'الموافقات', NULL),
  ('/foundation/settings', 'evidence', 30, 'Evidence', 'الأدلة', NULL),
  ('/foundation/sod', 'violations', 10, 'Violations', 'المخالفات', NULL),
  ('/foundation/sod', 'approvals', 20, 'Approvals', 'الموافقات', NULL);

DELETE FROM dos.ui_route_posture_score
WHERE route IN ('/foundation/operations-readiness', '/foundation/diagnostics');

INSERT INTO dos.ui_route_posture_score (
  route, score_id, kind, sort_order, label_en, label_ar, value, max_value, severity, status
)
VALUES
  ('/foundation/operations-readiness', 'ops-score', 'score', 10, 'Operational readiness', 'جاهزية التشغيل', 82, 100, 'low', 'healthy'),
  ('/foundation/operations-readiness', 'ops-maturity', 'maturity', 20, 'Control maturity', 'نضج الضوابط', 4, 5, 'medium', 'stable'),
  ('/foundation/operations-readiness', 'ops-gap', 'gap', 30, 'Escalation backlog', 'تراكم التصعيد', 7, NULL, 'high', 'attention'),
  ('/foundation/diagnostics', 'diag-score', 'score', 10, 'Diagnostic health', 'صحة التشخيص', 88, 100, 'low', 'healthy'),
  ('/foundation/diagnostics', 'diag-maturity', 'maturity', 20, 'Telemetry maturity', 'نضج القياس', 4, 5, 'medium', 'stable'),
  ('/foundation/diagnostics', 'diag-gap', 'gap', 30, 'Open failures', 'الإخفاقات المفتوحة', 3, NULL, 'medium', 'attention');

UPDATE dos.ui_route_template_binding
   SET props = jsonb_set(
     COALESCE(props, '{}'::jsonb),
     '{eventHandlers}',
     COALESCE(props->'eventHandlers', '{}'::jsonb) || jsonb_build_object(
       'foundation.partial.create', jsonb_build_object('method', 'redirect', 'url', route || '/new'),
       'foundation.partial.open-details', jsonb_build_object('method', 'redirect', 'url', route),
       'foundation.partial.export-evidence', jsonb_build_object('method', 'redirect', 'url', '/foundation/reports')
     ),
     true
   ),
   updated_at = now()
 WHERE route IN ('/foundation/positions','/foundation/locations','/foundation/records','/foundation/committees','/foundation/policies');

DO $$
DECLARE
  c_rows integer;
  c_scores integer;
BEGIN
  SELECT COUNT(*) INTO c_rows
  FROM dos.ui_route_record_row
  WHERE route IN ('/foundation/positions','/foundation/locations','/foundation/records','/foundation/committees','/foundation/policies');
  IF c_rows < 10 THEN
    RAISE EXCEPTION 'partial route depth assertion failed: expected >=10 record rows, got %', c_rows;
  END IF;

  SELECT COUNT(*) INTO c_scores
  FROM dos.ui_route_posture_score
  WHERE route IN ('/foundation/operations-readiness', '/foundation/diagnostics');
  IF c_scores < 6 THEN
    RAISE EXCEPTION 'partial route depth assertion failed: expected >=6 posture score rows, got %', c_scores;
  END IF;
END $$;

COMMIT;
