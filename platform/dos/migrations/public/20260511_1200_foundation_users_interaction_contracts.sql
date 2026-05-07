-- 20260511_1200_foundation_users_interaction_contracts.sql
--
-- Wave 03: users / teams / roles interaction contracts.
-- Adds typed filter/action seeds and event-handler bindings for
-- serializable action dispatch in dynamic templates.

BEGIN;

WITH target_routes(route) AS (
  VALUES ('/foundation/users'),('/foundation/teams'),('/foundation/roles')
)
DELETE FROM dos.ui_route_filter f
USING target_routes t
WHERE f.route = t.route
  AND f.filter_id = 'status';

WITH target_routes(route) AS (
  VALUES ('/foundation/users'),('/foundation/teams'),('/foundation/roles')
)
INSERT INTO dos.ui_route_filter (
  route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json, default_value, permission
)
SELECT route, 'status', 10, 'Status', 'الحالة', 'status', 'eq', 'select',
       '[{"value":"active","label":"Active"},{"value":"inactive","label":"Inactive"}]'::jsonb,
       'active', NULL
FROM target_routes;

WITH target_routes(route) AS (
  VALUES ('/foundation/users'),('/foundation/teams'),('/foundation/roles')
)
DELETE FROM dos.ui_route_table_action a
USING target_routes t
WHERE a.route = t.route
  AND a.action_id = 'create';

WITH target_routes(route) AS (
  VALUES ('/foundation/users'),('/foundation/teams'),('/foundation/roles')
)
INSERT INTO dos.ui_route_table_action (
  route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis
)
SELECT route, 'create', 'toolbar', 10, 'Create', 'إنشاء',
       jsonb_build_object('kind', 'dispatch_event', 'eventName', 'foundation.create'),
       NULL, 'primary'
FROM target_routes;

WITH target_routes(route) AS (
  VALUES ('/foundation/users'),('/foundation/teams'),('/foundation/roles')
)
DELETE FROM dos.ui_route_table_action a
USING target_routes t
WHERE a.route = t.route
  AND a.action_id = 'assign-role';

WITH target_routes(route) AS (
  VALUES ('/foundation/users'),('/foundation/teams'),('/foundation/roles')
)
INSERT INTO dos.ui_route_table_action (
  route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis
)
SELECT route, 'assign-role', 'batch', 20, 'Assign role', 'تعيين دور',
       jsonb_build_object('kind', 'dispatch_event', 'eventName', 'foundation.assign-role'),
       NULL, 'secondary'
FROM target_routes;

WITH target_routes(route) AS (
  VALUES ('/foundation/users'),('/foundation/teams'),('/foundation/roles')
)
DELETE FROM dos.ui_route_table_action a
USING target_routes t
WHERE a.route = t.route
  AND a.action_id = 'open-details';

WITH target_routes(route) AS (
  VALUES ('/foundation/users'),('/foundation/teams'),('/foundation/roles')
)
INSERT INTO dos.ui_route_table_action (
  route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis
)
SELECT route, 'open-details', 'row', 30, 'Open details', 'فتح التفاصيل',
       jsonb_build_object('kind', 'dispatch_event', 'eventName', 'foundation.open-details'),
       NULL, 'tertiary'
FROM target_routes;

UPDATE dos.ui_route_template_binding
   SET props = jsonb_set(
     COALESCE(props, '{}'::jsonb),
     '{eventHandlers}',
     COALESCE(props->'eventHandlers', '{}'::jsonb) || jsonb_build_object(
       'foundation.create', jsonb_build_object('method', 'redirect', 'url',
         CASE route
           WHEN '/foundation/users' THEN '/foundation/users/new'
           WHEN '/foundation/teams' THEN '/foundation/teams/new'
           WHEN '/foundation/roles' THEN '/foundation/roles/new'
           ELSE route
         END
       ),
       'foundation.assign-role', jsonb_build_object('method', 'redirect', 'url', route),
       'foundation.open-details', jsonb_build_object('method', 'redirect', 'url', route)
     ),
     true
   ),
   updated_at = now()
 WHERE route IN ('/foundation/users','/foundation/teams','/foundation/roles');

DO $$
DECLARE
  c_actions integer;
BEGIN
  SELECT COUNT(*) INTO c_actions
  FROM dos.ui_route_table_action
  WHERE route IN ('/foundation/users','/foundation/teams','/foundation/roles');
  IF c_actions < 9 THEN
    RAISE EXCEPTION 'users interaction assertion failed: expected >=9 action rows, got %', c_actions;
  END IF;
END $$;

COMMIT;
