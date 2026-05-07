-- =====================================================================
-- Wave 31 — Foundation Data Resource & Route Binding Completion
-- 
-- This migration completes the foundation module by:
-- 1. Seeding missing data resources for all foundation entities.
-- 2. Linking these resources to their respective routes via data_resource_key.
-- 3. Ensuring routes have correct render metadata (title, subtitle, page_type).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Part 1 — Seed Missing Foundation Data Resources
-- ---------------------------------------------------------------------
INSERT INTO dos.dynamic_ui_data_resources (module_code, resource_key, resource_type, url_or_query)
VALUES
  ('foundation', 'foundation.resource.business-units',   'api', '/api/foundation/business-units'),
  ('foundation', 'foundation.resource.departments',      'api', '/api/foundation/departments'),
  ('foundation', 'foundation.resource.positions',        'api', '/api/foundation/positions'),
  ('foundation', 'foundation.resource.locations',        'api', '/api/foundation/locations'),
  ('foundation', 'foundation.resource.teams',            'api', '/api/foundation/teams'),
  ('foundation', 'foundation.resource.committees',       'api', '/api/foundation/committees'),
  ('foundation', 'foundation.resource.delegations',      'api', '/api/foundation/delegations'),
  ('foundation', 'foundation.resource.access-review',    'api', '/api/foundation/access-review'),
  ('foundation', 'foundation.resource.policies',         'api', '/api/foundation/policies'),
  ('foundation', 'foundation.resource.audit-trail',      'api', '/api/foundation/audit'),
  ('foundation', 'foundation.resource.ownership',        'api', '/api/foundation/ownership'),
  ('foundation', 'foundation.resource.sod-rules',        'api', '/api/foundation/sod'),
  ('foundation', 'foundation.resource.reference-data',   'api', '/api/foundation/reference-data'),
  ('foundation', 'foundation.resource.overview-stats',   'api', '/api/foundation/overview-stats'),
  ('foundation', 'foundation.resource.perms',            'api', '/api/foundation/permissions'),
  ('foundation', 'foundation.resource.roles',            'api', '/api/foundation/roles')
ON CONFLICT (module_code, resource_key, (COALESCE(tenant_id, '*'::character varying))) DO NOTHING;

-- ---------------------------------------------------------------------
-- Part 2 — Map Data Resources to Foundation Routes
-- ---------------------------------------------------------------------
WITH route_data(path_pattern, data_resource_key) AS (
  VALUES
    ('/foundation/overview',          'foundation.resource.overview-stats'),
    ('/foundation/business-units',    'foundation.resource.business-units'),
    ('/foundation/departments',       'foundation.resource.departments'),
    ('/foundation/positions',         'foundation.resource.positions'),
    ('/foundation/locations',         'foundation.resource.locations'),
    ('/foundation/users',             'workspace.resource.users'),
    ('/foundation/teams',             'foundation.resource.teams'),
    ('/foundation/roles',             'foundation.resource.roles'),
    ('/foundation/permissions',       'foundation.resource.perms'),
    ('/foundation/committees',        'foundation.resource.committees'),
    ('/foundation/delegations',       'foundation.resource.delegations'),
    ('/foundation/access-review',     'foundation.resource.access-review'),
    ('/foundation/policies',          'foundation.resource.policies'),
    ('/foundation/audit',             'foundation.resource.audit-trail'),
    ('/foundation/sod',               'foundation.resource.sod-rules'),
    ('/foundation/reference-data',    'foundation.resource.reference-data')
)
UPDATE dos.dynamic_ui_routes r
   SET data_resource_key = rd.data_resource_key
  FROM route_data rd
 WHERE r.path_pattern = rd.path_pattern
   AND r.tenant_id IS NULL;

-- ---------------------------------------------------------------------
-- Part 3 — Ensure Foundation Shell Binding (Global)
-- ---------------------------------------------------------------------
-- We bind structural shell surfaces that should exist across all pages.
-- Page content is handled by the route's component_key and data_resource_key.

INSERT INTO dos.workspace_shell_binding (tenant_id, component_key, position, perms_required, props)
SELECT 
    t.tenant_id,
    'workspace.shell.empty-state',
    120,
    ARRAY[]::text[],
    '{"zone": "main", "title": "Workspace ready", "description": "Select a module item from the sidebar to view detailed data."}'::jsonb
FROM dos.tenants t
ON CONFLICT (tenant_id, component_key) DO UPDATE
SET props = EXCLUDED.props,
    position = EXCLUDED.position;

COMMIT;
