-- ============================================================
-- 20260507_2200_deploy_dogan_contracts_v1.sql
-- Deploys Dogan-AI / Shahin contract pack v1.0.0 (2026-05-07T12:48:28Z)
-- Source files:
--   dogan_shahin_foundation_workspace_contracts_json/
--     - shahin.product.contract.json   (20 modules)
--     - shahin.workspace.contract.json (14 shell componentKeys)
--     - foundation.module.contract.json (18 nav routes)
--
-- This migration REPLACES live state with the contract:
--   1. product_registry: ensure 'shahin-ai' exists
--   2. module_registry: 20 contract modules → status='active'; all
--      others → status='unavailable' (no destructive drop)
--   3. ui_module_nav_group: ensure foundation 'main' group
--   4. ui_module_nav_item (foundation): replace with 18 contract rows
--      (delete extras NOT in contract, upsert contract entries)
--   5. tenant_module_entitlements: 20 contract modules × all tenants
--      → entitlement_status='active'; non-contract modules → 'inactive'
-- Idempotent. Snapshot taken: shahin_grc_pre_contract_deploy_20260507T125658Z.sql.gz
-- ============================================================

BEGIN;

-- ============================================================
-- PHASE 1 — product_registry: ensure 'shahin-ai' product
-- ============================================================
INSERT INTO dos.product_registry
  (product_key, code, display_name, name_en, name_ar, description, status, version)
VALUES
  ('shahin-ai', 'shahin-ai', 'Shahin AI', 'Shahin AI', 'شاهين AI',
   'Shahin AI workspace product (Dogan-AI OS)', 'active', '1.0.0')
ON CONFLICT (product_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  name_en      = EXCLUDED.name_en,
  name_ar      = EXCLUDED.name_ar,
  description  = EXCLUDED.description,
  status       = 'active',
  version      = '1.0.0',
  updated_at   = now();

-- ============================================================
-- PHASE 2 — module_registry: deactivate everything outside contract
-- ============================================================
UPDATE dos.module_registry
   SET status = 'unavailable',
       updated_at = now()
 WHERE module_code NOT IN (
   'foundation','risk','compliance','policy','incident','workflow',
   'audit','evidence','vendor','asset','privacy','bcp','dora','qiyas',
   'config-center','dynamic-ui','ai','dsoc','dnoc','dauth'
 );

-- Upsert the 20 contract modules with category (tier) and sort_order
-- (sort_order matches contract array order × 10 to leave headroom).
INSERT INTO dos.module_registry
  (module_code, code, product_key, product_code, name_en, name_ar,
   tier, sort_order, status, description)
VALUES
  ('foundation',    'foundation',    'shahin-ai','shahin-ai','Foundation',     'التأسيس',         'platform-base',     10,  'active', 'Platform base module: org, identity, access, delegation, ownership, audit-readiness'),
  ('risk',          'risk',          'shahin-ai','shahin-ai','Risk',           'المخاطر',         'grc-core',          20,  'active', 'GRC core: risk register and assessment'),
  ('compliance',    'compliance',    'shahin-ai','shahin-ai','Compliance',     'الامتثال',        'grc-core',          30,  'active', 'GRC core: regulatory compliance'),
  ('policy',        'policy',        'shahin-ai','shahin-ai','Policy',         'السياسات',        'grc-core',          40,  'active', 'GRC core: policy lifecycle'),
  ('incident',      'incident',      'shahin-ai','shahin-ai','Incident',       'الحوادث',         'grc-core',          50,  'active', 'GRC core: incident management'),
  ('workflow',      'workflow',      'shahin-ai','shahin-ai','Workflow',       'سير العمل',       'platform-workflow', 60,  'active', 'Platform workflow runtime'),
  ('audit',         'audit',         'shahin-ai','shahin-ai','Audit',          'التدقيق',         'assurance',         70,  'active', 'Assurance: audit engagements'),
  ('evidence',      'evidence',      'shahin-ai','shahin-ai','Evidence',       'الأدلة',          'assurance',         80,  'active', 'Assurance: evidence collection'),
  ('vendor',        'vendor',        'shahin-ai','shahin-ai','Vendor',         'الموردون',        'third-party-risk',  90,  'active', 'Third-party risk management'),
  ('asset',         'asset',         'shahin-ai','shahin-ai','Asset',          'الأصول',          'operations-risk',   100, 'active', 'Asset register and ownership'),
  ('privacy',       'privacy',       'shahin-ai','shahin-ai','Privacy',        'الخصوصية',        'privacy',           110, 'active', 'Privacy and data protection'),
  ('bcp',           'bcp',           'shahin-ai','shahin-ai','BCP',            'استمرارية الأعمال','resilience',       120, 'active', 'Business continuity / resilience'),
  ('dora',          'dora',          'shahin-ai','shahin-ai','DORA',           'دورا',            'regulatory',        130, 'active', 'DORA regulatory compliance'),
  ('qiyas',         'qiyas',         'shahin-ai','shahin-ai','Qiyas',          'قياس',            'regulatory',        140, 'active', 'Qiyas regulatory compliance'),
  ('config-center', 'config-center', 'shahin-ai','shahin-ai','Config Center',  'مركز الإعدادات',  'platform-admin',    150, 'active', 'Tenant + product configuration center'),
  ('dynamic-ui',    'dynamic-ui',    'shahin-ai','shahin-ai','Dynamic UI',     'واجهة ديناميكية', 'platform-runtime',  160, 'active', 'Dynamic UI runtime resolver'),
  ('ai',            'ai',            'shahin-ai','shahin-ai','AI',             'الذكاء الاصطناعي','platform-ai',       170, 'active', 'AI engine and agent runtime'),
  ('dsoc',          'dsoc',          'shahin-ai','shahin-ai','DSOC',           'مركز عمليات الأمن','security-ops',     180, 'active', 'Security operations center'),
  ('dnoc',          'dnoc',          'shahin-ai','shahin-ai','DNOC',           'مركز عمليات الشبكة','network-ops',     190, 'active', 'Network operations center'),
  ('dauth',         'dauth',         'shahin-ai','shahin-ai','DAuth',          'المصادقة',        'identity-access',   200, 'active', 'Identity and access (Keycloak / OIDC)')
ON CONFLICT (module_code) DO UPDATE SET
  code         = EXCLUDED.code,
  product_key  = EXCLUDED.product_key,
  product_code = EXCLUDED.product_code,
  name_en      = EXCLUDED.name_en,
  name_ar      = EXCLUDED.name_ar,
  tier         = EXCLUDED.tier,
  sort_order   = EXCLUDED.sort_order,
  status       = 'active',
  description  = EXCLUDED.description,
  updated_at   = now();

-- ============================================================
-- PHASE 3 — Foundation nav: replace with the 18 contract rows
-- ============================================================

-- Ensure foundation main group exists
INSERT INTO dos.ui_module_nav_group
  (module_code, group_id, sort_order, label_key, label_en, label_ar, enabled)
VALUES
  ('foundation', 'main', 10, 'foundation.nav.group.main', 'Foundation', 'التأسيس', true)
ON CONFLICT (module_code, group_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_key  = EXCLUDED.label_key,
  label_en   = EXCLUDED.label_en,
  label_ar   = EXCLUDED.label_ar,
  enabled    = true,
  updated_at = now();

-- Delete foundation nav items NOT in the contract (18 item_ids and routes only)
DELETE FROM dos.ui_module_nav_item
 WHERE module_code = 'foundation'
   AND (
     route NOT IN (
       '/foundation/overview',
       '/foundation/organization',
       '/foundation/business-units',
       '/foundation/departments',
       '/foundation/users',
       '/foundation/roles',
       '/foundation/teams',
       '/foundation/locations',
       '/foundation/positions',
       '/foundation/committees',
       '/foundation/delegations',
       '/foundation/ownership-mapping',
       '/foundation/access-review',
       '/foundation/policies',
       '/foundation/data-processing',
       '/foundation/reference-data',
       '/foundation/audit',
       '/foundation/settings'
     )
     OR item_id NOT IN (
       'foundation.overview','foundation.organization','foundation.business_units',
       'foundation.departments','foundation.users','foundation.roles',
       'foundation.teams','foundation.locations','foundation.positions',
       'foundation.committees','foundation.delegations','foundation.ownership_mapping',
       'foundation.access_review','foundation.policies','foundation.data_processing',
       'foundation.reference_data','foundation.audit','foundation.settings'
     )
   );

-- Upsert the 18 contract nav items
INSERT INTO dos.ui_module_nav_item
  (module_code, item_id, group_id, sort_order, route, icon, permission,
   label_key, label_en, label_ar, enabled)
VALUES
  ('foundation', 'foundation.overview',          'main', 10,  '/foundation/overview',          'Dashboard',          'foundation.overview.read',          'foundation.overview.nav',          'Overview',           'نظرة عامة',          true),
  ('foundation', 'foundation.organization',      'main', 20,  '/foundation/organization',      'Building',           'foundation.organization.read',      'foundation.organization.nav',      'Organization',       'المنظمة',            true),
  ('foundation', 'foundation.business_units',    'main', 30,  '/foundation/business-units',    'Enterprise',         'foundation.business_units.read',    'foundation.business_units.nav',    'Business Units',     'الوحدات التجارية',   true),
  ('foundation', 'foundation.departments',       'main', 40,  '/foundation/departments',       'Network--3',         'foundation.departments.read',       'foundation.departments.nav',       'Departments',        'الإدارات',           true),
  ('foundation', 'foundation.users',             'main', 50,  '/foundation/users',             'User--multiple',     'foundation.users.read',             'foundation.users.nav',             'Users',              'المستخدمون',         true),
  ('foundation', 'foundation.roles',             'main', 60,  '/foundation/roles',             'UserRole',           'foundation.roles.read',             'foundation.roles.nav',             'Roles',              'الأدوار',            true),
  ('foundation', 'foundation.teams',             'main', 70,  '/foundation/teams',             'Group',              'foundation.teams.read',             'foundation.teams.nav',             'Teams',              'الفرق',              true),
  ('foundation', 'foundation.locations',         'main', 80,  '/foundation/locations',         'Location',           'foundation.locations.read',         'foundation.locations.nav',         'Locations',          'المواقع',            true),
  ('foundation', 'foundation.positions',         'main', 90,  '/foundation/positions',         'IbmCloud--Pak',      'foundation.positions.read',         'foundation.positions.nav',         'Positions',          'الوظائف',            true),
  ('foundation', 'foundation.committees',        'main', 100, '/foundation/committees',        'Events',             'foundation.committees.read',        'foundation.committees.nav',        'Committees',         'اللجان',             true),
  ('foundation', 'foundation.delegations',       'main', 110, '/foundation/delegations',       'UserAdmin',          'foundation.delegations.read',       'foundation.delegations.nav',       'Delegations',        'التفويضات',          true),
  ('foundation', 'foundation.ownership_mapping', 'main', 120, '/foundation/ownership-mapping', 'ConnectionSignal',   'foundation.ownership.read',         'foundation.ownership_mapping.nav', 'Ownership Mapping',  'خرائط الملكية',      true),
  ('foundation', 'foundation.access_review',     'main', 130, '/foundation/access-review',     'Security',           'foundation.access_review.read',     'foundation.access_review.nav',     'Access Review',      'مراجعة الصلاحيات',   true),
  ('foundation', 'foundation.policies',          'main', 140, '/foundation/policies',          'Document',           'foundation.policies.read',          'foundation.policies.nav',          'Policies',           'السياسات',           true),
  ('foundation', 'foundation.data_processing',   'main', 150, '/foundation/data-processing',   'DataBase',           'foundation.data_processing.read',   'foundation.data_processing.nav',   'Data Processing',    'معالجة البيانات',    true),
  ('foundation', 'foundation.reference_data',    'main', 160, '/foundation/reference-data',    'CatalogPublish',     'foundation.reference_data.read',    'foundation.reference_data.nav',    'Reference Data',     'البيانات المرجعية',  true),
  ('foundation', 'foundation.audit',             'main', 170, '/foundation/audit',             'Compare',            'foundation.audit.read',             'foundation.audit.nav',             'Audit',              'التدقيق',            true),
  ('foundation', 'foundation.settings',          'main', 180, '/foundation/settings',          'Settings',           'foundation.settings.read',          'foundation.settings.nav',          'Settings',           'الإعدادات',          true)
ON CONFLICT (module_code, item_id) DO UPDATE SET
  group_id   = EXCLUDED.group_id,
  sort_order = EXCLUDED.sort_order,
  route      = EXCLUDED.route,
  icon       = EXCLUDED.icon,
  permission = EXCLUDED.permission,
  label_key  = EXCLUDED.label_key,
  label_en   = EXCLUDED.label_en,
  label_ar   = EXCLUDED.label_ar,
  enabled    = true,
  updated_at = now();

-- ============================================================
-- PHASE 4 — tenant_module_entitlements: align to contract modules
-- ============================================================

-- Deactivate entitlements for any module not in contract
UPDATE dos.tenant_module_entitlements
   SET entitlement_status = 'suspended',
       updated_at = now()
 WHERE module_code NOT IN (
   'foundation','risk','compliance','policy','incident','workflow',
   'audit','evidence','vendor','asset','privacy','bcp','dora','qiyas',
   'config-center','dynamic-ui','ai','dsoc','dnoc','dauth'
 )
   AND entitlement_status = 'active';

-- Step A: For each (tenant, contract_module), if multiple active rows exist
-- under different product_codes, suspend duplicates so the partial unique
-- index (tenant_id, product_code, module_code) WHERE active stays valid.
WITH contract_modules(module_code) AS (
  VALUES
    ('foundation'),('risk'),('compliance'),('policy'),('incident'),
    ('workflow'),('audit'),('evidence'),('vendor'),('asset'),
    ('privacy'),('bcp'),('dora'),('qiyas'),('config-center'),
    ('dynamic-ui'),('ai'),('dsoc'),('dnoc'),('dauth')
), keepers AS (
  SELECT DISTINCT ON (e.tenant_id, e.module_code)
         e.entitlement_id
    FROM dos.tenant_module_entitlements e
    JOIN contract_modules m ON m.module_code = e.module_code
   WHERE e.entitlement_status = 'active'
   ORDER BY e.tenant_id, e.module_code, e.created_at
)
UPDATE dos.tenant_module_entitlements e
   SET entitlement_status = 'suspended',
       updated_at         = now()
 WHERE e.entitlement_status = 'active'
   AND e.module_code IN (SELECT module_code FROM contract_modules)
   AND e.entitlement_id NOT IN (SELECT entitlement_id FROM keepers);

-- Step B: Re-point each keeper row to product_code='shahin-ai' and ensure
-- it is active. Safe: only one keeper per (tenant, module).
WITH contract_modules(module_code) AS (
  VALUES
    ('foundation'),('risk'),('compliance'),('policy'),('incident'),
    ('workflow'),('audit'),('evidence'),('vendor'),('asset'),
    ('privacy'),('bcp'),('dora'),('qiyas'),('config-center'),
    ('dynamic-ui'),('ai'),('dsoc'),('dnoc'),('dauth')
)
UPDATE dos.tenant_module_entitlements e
   SET product_code       = 'shahin-ai',
       entitlement_status = 'active',
       source             = 'platform_dna',
       metadata           = e.metadata
                              || jsonb_build_object('contract','dogan-shahin-v1.0.0','reactivatedAt', now()),
       updated_at         = now()
 WHERE e.module_code IN (SELECT module_code FROM contract_modules)
   AND e.entitlement_status IN ('active','suspended','expired','cancelled','pending','not_entitled')
   AND e.entitlement_id IN (
     SELECT DISTINCT ON (x.tenant_id, x.module_code) x.entitlement_id
       FROM dos.tenant_module_entitlements x
      WHERE x.module_code IN (SELECT module_code FROM contract_modules)
      ORDER BY x.tenant_id, x.module_code,
               CASE WHEN x.entitlement_status='active' THEN 0 ELSE 1 END,
               x.created_at
   );

-- Step C: Insert (tenant, contract_module) pairs that have no row at all.
WITH all_tenants AS (
  SELECT DISTINCT tenant_id FROM dos.tenant_module_entitlements
  UNION
  SELECT DISTINCT tenant_id FROM dos.workspace_shell_binding
), contract_modules(module_code) AS (
  VALUES
    ('foundation'),('risk'),('compliance'),('policy'),('incident'),
    ('workflow'),('audit'),('evidence'),('vendor'),('asset'),
    ('privacy'),('bcp'),('dora'),('qiyas'),('config-center'),
    ('dynamic-ui'),('ai'),('dsoc'),('dnoc'),('dauth')
), valid_tenants AS (
  SELECT t.tenant_id FROM all_tenants t
   WHERE EXISTS (SELECT 1 FROM dos.tenants r WHERE r.tenant_id = t.tenant_id)
), missing AS (
  SELECT t.tenant_id, m.module_code
    FROM valid_tenants t CROSS JOIN contract_modules m
    LEFT JOIN dos.tenant_module_entitlements e
      ON e.tenant_id = t.tenant_id AND e.module_code = m.module_code
   WHERE t.tenant_id IS NOT NULL
     AND e.entitlement_id IS NULL
)
INSERT INTO dos.tenant_module_entitlements
  (entitlement_id, tenant_id, product_code, module_code,
   entitlement_status, source, limits_json, metadata)
SELECT
  substr(md5(tenant_id || ':' || module_code || ':contract_v1'), 1, 32),
  tenant_id,
  'shahin-ai',
  module_code,
  'active',
  'platform_dna',
  '{}'::jsonb,
  jsonb_build_object('contract','dogan-shahin-v1.0.0','seededAt', now())
FROM missing
ON CONFLICT (entitlement_id) DO NOTHING;

-- ============================================================
-- PHASE 5 — Post-assertions
-- ============================================================
DO $$
DECLARE
  v_active_modules int;
  v_foundation_items int;
  v_entitled_pairs int;
  v_tenants int;
BEGIN
  SELECT count(*) INTO v_active_modules
    FROM dos.module_registry WHERE status = 'active';
  SELECT count(*) INTO v_foundation_items
    FROM dos.ui_module_nav_item WHERE module_code = 'foundation';
  SELECT count(*) INTO v_entitled_pairs
    FROM dos.tenant_module_entitlements
    WHERE entitlement_status = 'active'
      AND module_code IN ('foundation','risk','compliance','policy','incident',
                          'workflow','audit','evidence','vendor','asset',
                          'privacy','bcp','dora','qiyas','config-center',
                          'dynamic-ui','ai','dsoc','dnoc','dauth');
  SELECT count(DISTINCT tenant_id) INTO v_tenants
    FROM dos.tenant_module_entitlements WHERE entitlement_status = 'active';

  RAISE NOTICE 'Contract deploy results:';
  RAISE NOTICE '  Active modules           : % (expected 20)', v_active_modules;
  RAISE NOTICE '  Foundation nav items     : % (expected 18)', v_foundation_items;
  RAISE NOTICE '  Active entitlement pairs : %', v_entitled_pairs;
  RAISE NOTICE '  Distinct active tenants  : %', v_tenants;

  IF v_active_modules <> 20 THEN
    RAISE EXCEPTION 'Post-assert failed: expected 20 active modules, got %', v_active_modules;
  END IF;
  IF v_foundation_items <> 18 THEN
    RAISE EXCEPTION 'Post-assert failed: expected 18 foundation nav items, got %', v_foundation_items;
  END IF;
END;
$$;

COMMIT;
