-- =====================================================================
-- 0040_down — Reverse foundation template-only routing rewrite.
--
-- Reverts component_key on the 21 foundation pages back to the legacy
-- `foundation.*.page` keys (still resolvable through component-map.ts
-- which keeps both the legacy aliases and the canonical archetype
-- targets). Also removes the /foundation/roles/:id binding seeded by
-- 0040 and clears the permission_key set on /profile and
-- /tenant-profile.
--
-- Idempotent and safe to re-run; no archetype roster changes.
-- =====================================================================
BEGIN;

WITH legacy_map(path_pattern, component_key) AS (VALUES
  ('/foundation',                     'foundation.overview.page'),
  ('/foundation/overview',            'foundation.overview.page'),
  ('/foundation/records',             'foundation.users.page'),
  ('/foundation/workflows',           'foundation.access-review.page'),
  ('/foundation/reports',             'foundation.audit.page'),
  ('/foundation/settings',            'foundation.sod.page'),
  ('/foundation/organization',        'foundation.organization.page'),
  ('/foundation/business-units',      'foundation.business-units.page'),
  ('/foundation/departments',         'foundation.departments.page'),
  ('/foundation/positions',           'foundation.positions.page'),
  ('/foundation/locations',           'foundation.locations.page'),
  ('/foundation/users',               'foundation.users.page'),
  ('/foundation/teams',               'foundation.teams.page'),
  ('/foundation/roles',               'foundation.roles.page'),
  ('/foundation/roles/:id',           'foundation.roles.page'),
  ('/foundation/committees',          'foundation.committees.page'),
  ('/foundation/delegations',         'foundation.delegations.page'),
  ('/foundation/ownership-mapping',   'foundation.ownership.page'),
  ('/foundation/permissions',         'foundation.permissions.page'),
  ('/foundation/access-review',       'foundation.access-review.page'),
  ('/foundation/policies',            'foundation.policies.page'),
  ('/foundation/data-processing',     'foundation.policies.page'),
  ('/foundation/reference-data',      'foundation.policies.page'),
  ('/foundation/audit',               'foundation.audit.page'),
  ('/foundation/operations-readiness','foundation.overview.page')
)
UPDATE dos.dynamic_ui_routes r
   SET component_key = m.component_key
  FROM legacy_map m
 WHERE r.path_pattern = m.path_pattern
   AND r.module_code  = 'foundation';

DELETE FROM dos.ui_route_template_binding
 WHERE route = '/foundation/roles/:id';

UPDATE dos.dynamic_ui_routes
   SET permission_key = NULL
 WHERE path_pattern IN ('/profile', '/tenant-profile')
   AND permission_key = 'foundation.read';

COMMIT;
