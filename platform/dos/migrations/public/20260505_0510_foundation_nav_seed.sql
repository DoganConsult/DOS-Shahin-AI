-- 20260505_0510_foundation_nav_seed.sql
-- Owner: ui-os-service.
--
-- Phase F-F10 — seed Foundation module navigation into the new
-- dos.ui_module_nav_group / dos.ui_module_nav_item tables. Mirrors
-- platform/foundation/contracts/navigation/navigation.json (18 items
-- across 3 groups: organization, identity, governance) so the live
-- sidebar renders identically once the FE consumer points at the new
-- resolver endpoint.
--
-- Idempotent (UPSERT on PK).

BEGIN;

-- =====================================================================
-- Groups
-- =====================================================================
INSERT INTO dos.ui_module_nav_group
  (module_code, group_id, sort_order, label_key, label_en, label_ar) VALUES
  ('foundation', 'foundation.group.organization', 10,
   'modules.foundation.nav.group.organization', 'Organization', 'المؤسسة'),
  ('foundation', 'foundation.group.identity',     20,
   'modules.foundation.nav.group.identity',     'Identity',    'الهوية'),
  ('foundation', 'foundation.group.governance',   30,
   'modules.foundation.nav.group.governance',   'Governance',  'الحوكمة')
ON CONFLICT (module_code, group_id) DO UPDATE
   SET sort_order = EXCLUDED.sort_order,
       label_key  = EXCLUDED.label_key,
       label_en   = EXCLUDED.label_en,
       label_ar   = EXCLUDED.label_ar,
       updated_at = now();

-- =====================================================================
-- Items
-- =====================================================================
INSERT INTO dos.ui_module_nav_item
  (module_code, item_id, group_id, sort_order, route, icon, permission, label_key, label_en, label_ar) VALUES

  -- ── Organization group ──
  ('foundation', 'foundation.overview',        'foundation.group.organization',  10,
   '/foundation/overview',        'layout-dashboard', 'foundation.read',
   'modules.foundation.nav.overview',       'Overview',         'نظرة عامة'),
  ('foundation', 'foundation.organization',    'foundation.group.organization',  20,
   '/foundation/organization',    'sitemap',          'foundation.read',
   'modules.foundation.nav.organization',   'Organization',     'المؤسسة'),
  ('foundation', 'foundation.business-units',  'foundation.group.organization',  30,
   '/foundation/business-units',  'building',         'foundation.read',
   'modules.foundation.nav.businessUnits',  'Business units',   'الوحدات التجارية'),
  ('foundation', 'foundation.departments',     'foundation.group.organization',  40,
   '/foundation/departments',     'users',            'foundation.read',
   'modules.foundation.nav.departments',    'Departments',      'الإدارات'),
  ('foundation', 'foundation.positions',       'foundation.group.organization',  50,
   '/foundation/positions',       'id-card',          'foundation.read',
   'modules.foundation.nav.positions',      'Positions',        'الوظائف'),
  ('foundation', 'foundation.locations',       'foundation.group.organization',  60,
   '/foundation/locations',       'map-pin',          'foundation.read',
   'modules.foundation.nav.locations',      'Locations',        'المواقع'),

  -- ── Identity group ──
  ('foundation', 'foundation.users',           'foundation.group.identity',      10,
   '/foundation/users',           'user',             'foundation.user.read',
   'modules.foundation.nav.users',          'Users',            'المستخدمون'),
  ('foundation', 'foundation.teams',           'foundation.group.identity',      20,
   '/foundation/teams',           'users-group',      'foundation.read',
   'modules.foundation.nav.teams',          'Teams',            'الفِرق'),
  ('foundation', 'foundation.roles',           'foundation.group.identity',      30,
   '/foundation/roles',           'key',              'foundation.admin.read',
   'modules.foundation.nav.roles',          'Roles',            'الأدوار'),

  -- ── Governance group ──
  ('foundation', 'foundation.committees',      'foundation.group.governance',    10,
   '/foundation/committees',      'gavel',            'foundation.read',
   'modules.foundation.nav.committees',     'Committees',       'اللجان'),
  ('foundation', 'foundation.delegations',     'foundation.group.governance',    20,
   '/foundation/delegations',     'share',            'foundation.read',
   'modules.foundation.nav.delegations',    'Delegations',      'التفويضات'),
  ('foundation', 'foundation.ownership-mapping','foundation.group.governance',   30,
   '/foundation/ownership-mapping','link',            'foundation.read',
   'modules.foundation.nav.ownershipMapping','Ownership mapping','خرائط الملكية'),
  ('foundation', 'foundation.access-review',   'foundation.group.governance',    40,
   '/foundation/access-review',   'shield-check',     'access_review:create',
   'modules.foundation.nav.accessReview',   'Access review',    'مراجعة الصلاحيات'),
  ('foundation', 'foundation.policies',        'foundation.group.governance',    50,
   '/foundation/policies',        'file-shield',      'foundation.read',
   'modules.foundation.nav.policies',       'Policies',         'السياسات'),
  ('foundation', 'foundation.data-processing', 'foundation.group.governance',    60,
   '/foundation/data-processing', 'database',         'foundation.read',
   'modules.foundation.nav.dataProcessing', 'Data processing',  'معالجة البيانات'),
  ('foundation', 'foundation.reference-data',  'foundation.group.governance',    70,
   '/foundation/reference-data',  'list',             'foundation.read',
   'modules.foundation.nav.referenceData',  'Reference data',   'البيانات المرجعية'),
  ('foundation', 'foundation.audit',           'foundation.group.governance',    80,
   '/foundation/audit',           'history',          'audit_trail.read',
   'modules.foundation.nav.audit',          'Audit',            'التدقيق'),
  ('foundation', 'foundation.settings',        'foundation.group.governance',    90,
   '/foundation/settings',        'settings',         'foundation.admin.read',
   'modules.foundation.nav.settings',       'Settings',         'الإعدادات')
ON CONFLICT (module_code, item_id) DO UPDATE
   SET group_id   = EXCLUDED.group_id,
       sort_order = EXCLUDED.sort_order,
       route      = EXCLUDED.route,
       icon       = EXCLUDED.icon,
       permission = EXCLUDED.permission,
       label_key  = EXCLUDED.label_key,
       label_en   = EXCLUDED.label_en,
       label_ar   = EXCLUDED.label_ar,
       updated_at = now();

COMMIT;
