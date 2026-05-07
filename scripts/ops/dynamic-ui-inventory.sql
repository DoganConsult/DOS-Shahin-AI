-- dynamic-ui-inventory.sql
-- Read-only reporting pack for Dynamic UI + workspace shell (AGENTS.md doctrine).
-- Run against the test/prod Postgres DB as an ops user with SELECT on dos.*.
--
-- Covers:
--   * dynamic_ui_route_metadata ↔ ui_route_template_binding (both directions)
--   * dynamic_ui_routes enrolled paths without route_metadata (P0-2 style)
--   * dynamic_ui_widgets: routes with zero active global rows (foundation module)
--   * workspace shell: module-cards surface in main + tenant_module_entitlements
--
-- Usage:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/ops/dynamic-ui-inventory.sql

\set QUIET on
\pset footer off

\echo '=== A1) template render_mode metadata but NO ui_route_template_binding row ==='
SELECT m.route, m.render_mode, m.template_binding_required, m.notes
  FROM dos.dynamic_ui_route_metadata m
 WHERE m.render_mode = 'template'
   AND m.template_binding_required IS TRUE
   AND NOT EXISTS (
         SELECT 1 FROM dos.ui_route_template_binding b WHERE b.route = m.route
       )
 ORDER BY m.route;

\echo ''
\echo '=== A2) ui_route_template_binding row but NO dynamic_ui_route_metadata ==='
SELECT b.route, b.archetype, b.template_export
  FROM dos.ui_route_template_binding b
 WHERE NOT EXISTS (
         SELECT 1 FROM dos.dynamic_ui_route_metadata m WHERE m.route = b.route
       )
 ORDER BY b.route;

\echo ''
\echo '=== B) dynamic_ui_routes: path_pattern with no dynamic_ui_route_metadata (when table exists) ==='
SELECT r.path_pattern, r.module_code, r.is_active
  FROM dos.dynamic_ui_routes r
 WHERE COALESCE(r.is_active, TRUE)
   AND NOT EXISTS (
         SELECT 1 FROM dos.dynamic_ui_route_metadata m WHERE m.route = r.path_pattern
       )
 ORDER BY r.module_code, r.path_pattern;

\echo ''
\echo '=== C) Foundation DynamicPageHost contract routes: zero ACTIVE global widget rows ==='
-- Contract routes from foundation.module.routes.ts (DynamicPageHost + contractRoute only).
WITH host_routes(route) AS (
  VALUES
    ('/foundation/organization'),
    ('/foundation/departments'),
    ('/foundation/business-units'),
    ('/foundation/teams'),
    ('/foundation/roles'),
    ('/foundation/positions'),
    ('/foundation/users'),
    ('/foundation/committees'),
    ('/foundation/delegations'),
    ('/foundation/locations'),
    ('/foundation/policies'),
    ('/foundation/reference-data'),
    ('/foundation/data-processing'),
    ('/foundation/ownership-mapping'),
    ('/foundation/access-review'),
    ('/foundation/audit'),
    ('/foundation/operations-readiness'),
    ('/foundation/people/onboarding'),
    ('/foundation/people/lifecycle'),
    ('/foundation/people/probation-due'),
    ('/foundation/governance/authority-matrix'),
    ('/foundation/governance/sod-rules'),
    ('/foundation/governance/sod-violations'),
    ('/foundation/governance/policy-acks'),
    ('/foundation/governance/training'),
    ('/foundation/governance/coi'),
    ('/foundation/settings'),
    ('/foundation/permissions')
),
cnt AS (
  SELECT w.route, COUNT(*)::int AS n
    FROM dos.dynamic_ui_widgets w
   WHERE w.module_code = 'foundation'
     AND w.tenant_id IS NULL
     AND COALESCE(w.is_active, TRUE)
   GROUP BY w.route
)
SELECT h.route,
       COALESCE(c.n, 0) AS active_global_widget_rows
  FROM host_routes h
  LEFT JOIN cnt c ON c.route = h.route
 WHERE COALESCE(c.n, 0) = 0
 ORDER BY h.route;

\echo ''
\echo '=== D) workspace_shell_binding: module-cards surface + entitlement counts per tenant ==='
SELECT b.tenant_id,
       BOOL_OR(b.component_key = 'workspace.shell.module-cards' AND COALESCE(b.enabled, FALSE)) AS has_module_cards_binding,
       COUNT(*) FILTER (WHERE b.component_key = 'workspace.shell.module-cards') AS module_cards_binding_rows,
       (SELECT COUNT(*)::int
          FROM dos.tenant_module_entitlements e
         WHERE e.tenant_id = b.tenant_id
           AND e.entitlement_status = 'active') AS active_entitlement_rows
  FROM dos.workspace_shell_binding b
 GROUP BY b.tenant_id
 ORDER BY b.tenant_id;

\echo ''
\echo '=== D2) Tenants missing workspace.shell.module-cards binding (among tenants that have any binding) ==='
SELECT DISTINCT b.tenant_id
  FROM dos.workspace_shell_binding b
 WHERE NOT EXISTS (
         SELECT 1
           FROM dos.workspace_shell_binding x
          WHERE x.tenant_id = b.tenant_id
            AND x.component_key = 'workspace.shell.module-cards'
            AND COALESCE(x.enabled, FALSE)
       )
 ORDER BY 1;

\echo ''
\echo '=== Done ==='
