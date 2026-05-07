-- ============================================================
-- 20260507_2000_shahin_nav_contract_v2_full_entitlement.sql
-- Shahin-AI Workspace Nav Contract v2 — Full Entitlement
-- ============================================================
-- What this migration does:
--  1. Adds 5 new modules (issues, dora, ksa-regulatory, attestation, inbox)
--  2. Fixes product_key for foundation module → 'foundation'
--  3. Sets canonical sort_order + tier for all 28 business modules
--  4. Sets module status = 'active' for all 28 business modules
--  5. Upserts nav groups for all 28 modules (creates missing ones)
--  6. Upserts nav items for all 28 modules (creates missing ones)
--  7. Removes 6 action-route-only nav items from foundation sidebar
--  8. Inserts tenant_module_entitlements for ALL modules ALL tenants
--  9. Fixes workspace_shell_binding for 2 under-provisioned tenants
-- Idempotent: all INSERT ... ON CONFLICT DO UPDATE/NOTHING
-- ============================================================

BEGIN;

-- ============================================================
-- PHASE 0 — Pre-assertion
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dos.module_registry WHERE module_code = 'foundation') THEN
    RAISE EXCEPTION 'Pre-assertion failed: foundation module missing from module_registry';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM dos.product_registry WHERE product_key = 'foundation') THEN
    RAISE EXCEPTION 'Pre-assertion failed: foundation product missing from product_registry';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM dos.product_registry WHERE product_key = 'agrc') THEN
    RAISE EXCEPTION 'Pre-assertion failed: agrc product missing from product_registry';
  END IF;
END;
$$;

-- ============================================================
-- PHASE 1 — Module Registry: add 5 new modules
-- ============================================================

INSERT INTO dos.module_registry
  (module_code, code, product_key, product_code, name_en, name_ar, description, tier, sort_order, status)
VALUES
  ('issues',        'issues',        'agrc', 'agrc', 'Issues',             'المشكلات',        'Issue register, investigations, corrective actions',  'grc-core',        170, 'active'),
  ('dora',          'dora',          'agrc', 'agrc', 'Digital Resilience', 'المرونة الرقمية', 'DORA digital operational resilience act compliance',   'operational-risk', 260, 'active'),
  ('ksa-regulatory','ksa-regulatory','agrc', 'agrc', 'KSA Regulatory',     'التنظيم السعودي', 'KSA regulatory obligations and compliance tracking',   'operational-risk', 270, 'active'),
  ('attestation',   'attestation',   'agrc', 'agrc', 'Attestations',       'المصادقات',       'Attestation campaigns, sign-off, and evidence capture','assurance',        310, 'active'),
  ('inbox',         'inbox',         'agrc', 'agrc', 'Inbox',              'صندوق الوارد',    'Unified task inbox for cross-module user actions',     'assurance',        370, 'active')
ON CONFLICT (module_code) DO UPDATE SET
  name_en      = EXCLUDED.name_en,
  name_ar      = EXCLUDED.name_ar,
  description  = EXCLUDED.description,
  tier         = EXCLUDED.tier,
  sort_order   = EXCLUDED.sort_order,
  status       = EXCLUDED.status,
  updated_at   = now();

-- ============================================================
-- PHASE 2 — Module Registry: fix product_key + sort_order + tier + status
-- ============================================================

UPDATE dos.module_registry SET
  product_key  = 'foundation',
  product_code = 'foundation',
  tier         = 'foundation',
  sort_order   = 10,
  status       = 'active',
  updated_at   = now()
WHERE module_code = 'foundation';

UPDATE dos.module_registry SET tier = 'grc-core', sort_order = 110, status = 'active', updated_at = now() WHERE module_code = 'risk';
UPDATE dos.module_registry SET tier = 'grc-core', sort_order = 120, status = 'active', updated_at = now() WHERE module_code = 'compliance';
UPDATE dos.module_registry SET tier = 'grc-core', sort_order = 130, status = 'active', updated_at = now() WHERE module_code = 'controls';
UPDATE dos.module_registry SET tier = 'grc-core', sort_order = 140, status = 'active', updated_at = now() WHERE module_code = 'policy';
UPDATE dos.module_registry SET tier = 'grc-core', sort_order = 150, status = 'active', updated_at = now() WHERE module_code = 'audit';
UPDATE dos.module_registry SET tier = 'grc-core', sort_order = 160, status = 'active', updated_at = now() WHERE module_code = 'evidence';
UPDATE dos.module_registry SET tier = 'grc-core', sort_order = 180, status = 'active', updated_at = now() WHERE module_code = 'remediation';
UPDATE dos.module_registry SET tier = 'operational-risk', sort_order = 210, status = 'active', updated_at = now() WHERE module_code = 'incident';
UPDATE dos.module_registry SET tier = 'operational-risk', sort_order = 220, status = 'active', updated_at = now() WHERE module_code = 'vendor';
UPDATE dos.module_registry SET tier = 'operational-risk', sort_order = 230, status = 'active', updated_at = now() WHERE module_code = 'asset';
UPDATE dos.module_registry SET tier = 'operational-risk', sort_order = 240, status = 'active', updated_at = now() WHERE module_code = 'privacy';
UPDATE dos.module_registry SET tier = 'operational-risk', sort_order = 250, status = 'active', updated_at = now() WHERE module_code = 'bcp';
UPDATE dos.module_registry SET tier = 'operational-risk', sort_order = 280, status = 'active', updated_at = now() WHERE module_code = 'qiyas';
UPDATE dos.module_registry SET tier = 'assurance', sort_order = 320, status = 'active', updated_at = now() WHERE module_code = 'training';
UPDATE dos.module_registry SET tier = 'assurance', sort_order = 330, status = 'active', updated_at = now() WHERE module_code = 'reporting';
UPDATE dos.module_registry SET tier = 'assurance', sort_order = 340, status = 'active', updated_at = now() WHERE module_code = 'analytics';
UPDATE dos.module_registry SET tier = 'assurance', sort_order = 350, status = 'active', updated_at = now() WHERE module_code = 'workflow';
UPDATE dos.module_registry SET tier = 'assurance', sort_order = 360, status = 'active', updated_at = now() WHERE module_code = 'action';
UPDATE dos.module_registry SET tier = 'assurance', sort_order = 380, status = 'active', updated_at = now() WHERE module_code = 'knowledge';
UPDATE dos.module_registry SET tier = 'ai',        sort_order = 410, status = 'active', updated_at = now() WHERE module_code = 'ai-platform';
UPDATE dos.module_registry SET tier = 'ai',        sort_order = 420, status = 'active', updated_at = now() WHERE module_code = 'ai-os';
UPDATE dos.module_registry SET tier = 'ai',        sort_order = 430, status = 'active', updated_at = now() WHERE module_code = 'agrc-engine';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 910, updated_at = now() WHERE module_code = 'workspace-shell';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 920, updated_at = now() WHERE module_code = 'dynamic-ui';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 930, updated_at = now() WHERE module_code = 'config-center';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 940, updated_at = now() WHERE module_code = 'notification';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 950, updated_at = now() WHERE module_code = 'onboarding';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 960, updated_at = now() WHERE module_code = 'admin';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 970, updated_at = now() WHERE module_code = 'governance';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 975, updated_at = now() WHERE module_code = 'dauth';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 980, updated_at = now() WHERE module_code = 'dnoc';
UPDATE dos.module_registry SET tier = 'admin',     sort_order = 985, updated_at = now() WHERE module_code = 'dsoc';

-- ============================================================
-- PHASE 3 — Remove action-only nav items from Foundation sidebar
-- /*/new routes must NOT appear as sidebar items
-- ============================================================

DELETE FROM dos.ui_module_nav_item
WHERE module_code = 'foundation'
  AND item_id IN (
    'foundation.users.new',
    'foundation.teams.new',
    'foundation.roles.new',
    'foundation.delegations.new',
    'foundation.access-review.new',
    'foundation.workflows.new'
  );

-- ============================================================
-- PHASE 4 — Nav Groups: upsert all 28 business modules
-- Convention: group_id = '<module>.main' for top-level module groups
-- Foundation keeps its 4 semantic groups; others get main group
-- ============================================================

INSERT INTO dos.ui_module_nav_group
  (module_code, group_id, sort_order, label_en, label_ar, enabled)
VALUES
  -- Foundation (keep existing 4 — upsert to confirm labels/order)
  ('foundation','foundation.group.organization', 10, 'Organization',    'المؤسسة',  true),
  ('foundation','foundation.group.identity',     20, 'Identity',         'الهوية',   true),
  ('foundation','foundation.group.governance',   30, 'Governance',       'الحوكمة',  true),
  ('foundation','foundation.group.main',         40, 'Foundation',       'الأساس',   true),
  -- GRC Core
  ('risk',      'risk.overview',   10, 'Overview',   'نظرة عامة', true),
  ('risk',      'risk.manage',     20, 'Manage',     'إدارة',     true),
  ('risk',      'risk.analytics',  30, 'Analytics',  'التحليلات', true),
  ('compliance','compliance.overview',   10, 'Overview',   'نظرة عامة', true),
  ('compliance','compliance.obligations',20, 'Obligations','الالتزامات',true),
  ('compliance','compliance.testing',    30, 'Testing',    'الاختبار',  true),
  ('controls',  'controls.overview', 10, 'Overview',      'نظرة عامة', true),
  ('controls',  'controls.library',  20, 'Library',       'المكتبة',   true),
  ('policy',    'policy.overview',   10, 'Overview',      'نظرة عامة', true),
  ('policy',    'policy.manage',     20, 'Policies',      'السياسات',  true),
  ('audit',     'audit.overview',    10, 'Overview',      'نظرة عامة', true),
  ('audit',     'audit.engagements', 20, 'Engagements',   'مهام المراجعة', true),
  ('evidence',  'evidence.overview', 10, 'Overview',      'نظرة عامة', true),
  ('evidence',  'evidence.requests', 20, 'Requests',      'الطلبات',   true),
  ('issues',    'issues.main',       10, 'Issues',        'المشكلات',  true),
  ('remediation','remediation.main', 10, 'Remediation',   'المعالجة',  true),
  -- Operational Risk
  ('incident',       'incident.main',       10, 'Incidents',          'الحوادث',           true),
  ('vendor',         'vendor.main',         10, 'Vendor Risk',        'مخاطر الموردين',    true),
  ('asset',          'asset.main',          10, 'Assets',             'الأصول',            true),
  ('privacy',        'privacy.main',        10, 'Privacy',            'الخصوصية',          true),
  ('bcp',            'bcp.main',            10, 'Business Continuity','استمرارية الأعمال', true),
  ('dora',           'dora.main',           10, 'Digital Resilience', 'المرونة الرقمية',   true),
  ('ksa-regulatory', 'ksa-regulatory.main', 10, 'KSA Regulatory',    'التنظيم السعودي',   true),
  ('qiyas',          'qiyas.main',          10, 'Qiyas',             'قياس',              true),
  -- Assurance & Work
  ('attestation','attestation.main', 10, 'Attestations', 'المصادقات',       true),
  ('training',   'training.main',    10, 'Training',     'التدريب',         true),
  ('reporting',  'reporting.overview',  10, 'Overview',  'نظرة عامة',       true),
  ('reporting',  'reporting.dashboards',20, 'Dashboards','لوحات المعلومات', true),
  ('analytics',  'analytics.main',   10, 'Analytics',    'التحليلات',       true),
  ('workflow',   'workflow.overview', 10, 'Overview',     'نظرة عامة',       true),
  ('workflow',   'workflow.active',   20, 'Active',       'النشطة',          true),
  ('action',     'action.main',      10, 'Actions',      'الإجراءات',        true),
  ('inbox',      'inbox.main',       10, 'Inbox',        'صندوق الوارد',    true),
  ('knowledge',  'knowledge.overview', 10, 'Overview',   'نظرة عامة',       true),
  ('knowledge',  'knowledge.articles', 20, 'Articles',   'المقالات',        true),
  -- AI / Intelligence
  ('ai-platform',  'ai-platform.main',  10, 'AI Platform',  'منصة الذكاء الاصطناعي', true),
  ('ai-os',        'ai-os.main',        10, 'AI OS',        'نظام ذكاء اصطناعي',     true),
  ('agrc-engine',  'agrc-engine.main',  10, 'AGRC Engine',  'محرك الحوكمة',          true)
ON CONFLICT (module_code, group_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en   = EXCLUDED.label_en,
  label_ar   = EXCLUDED.label_ar,
  enabled    = EXCLUDED.enabled,
  updated_at = now();

-- ============================================================
-- PHASE 5 — Nav Items: upsert all 28 business modules
-- ============================================================

INSERT INTO dos.ui_module_nav_item
  (module_code, item_id, group_id, sort_order, route, icon, permission, label_en, label_ar, enabled)
VALUES

  -- ── FOUNDATION (kept existing, fixes only) ──
  ('foundation','foundation.overview',          'foundation.group.organization', 1,  '/foundation/overview',          'layout-dashboard','foundation.read',             'Overview',              'نظرة عامة',           true),
  ('foundation','foundation.organization',      'foundation.group.organization', 2,  '/foundation/organization',      'sitemap',         'foundation.read',             'Organization',          'المؤسسة',             true),
  ('foundation','foundation.business-units',    'foundation.group.organization', 3,  '/foundation/business-units',    'building',        'foundation.read',             'Business units',        'الوحدات التجارية',    true),
  ('foundation','foundation.departments',       'foundation.group.organization', 4,  '/foundation/departments',       'users',           'foundation.read',             'Departments',           'الإدارات',            true),
  ('foundation','foundation.positions',         'foundation.group.organization', 5,  '/foundation/positions',         'id-card',         'foundation.read',             'Positions',             'الوظائف',             true),
  ('foundation','foundation.locations',         'foundation.group.organization', 9,  '/foundation/locations',         'map-pin',         'foundation.read',             'Locations',             'المواقع',             true),
  ('foundation','foundation.users',             'foundation.group.identity',     6,  '/foundation/users',             'user',            'foundation.user.read',        'Users',                 'المستخدمون',          true),
  ('foundation','foundation.teams',             'foundation.group.identity',     7,  '/foundation/teams',             'users-group',     'foundation.read',             'Teams',                 'الفِرق',              true),
  ('foundation','foundation.roles',             'foundation.group.identity',     8,  '/foundation/roles',             'key',             'foundation.admin',            'Roles',                 'الأدوار',             true),
  ('foundation','foundation.people.lifecycle',  'foundation.group.identity',    100, '/foundation/people/lifecycle',  'user-profile',    'foundation.people.read',      'People lifecycle',      'دورة حياة الموظفين',  true),
  ('foundation','foundation.people.onboarding', 'foundation.group.identity',    110, '/foundation/people/onboarding', 'user-follow',     'foundation.people.read',      'Onboarding',            'الإلحاق الوظيفي',     true),
  ('foundation','foundation.people.probation-due','foundation.group.identity',  120, '/foundation/people/probation-due','time',          'foundation.people.read',      'Probation due',         'انتهاء فترة التجربة', true),
  ('foundation','foundation.committees',              'foundation.group.governance', 10,  '/foundation/committees',              'gavel',        'foundation.read',              'Committees',            'اللجان',              true),
  ('foundation','foundation.delegations',             'foundation.group.governance', 11,  '/foundation/delegations',             'share',        'foundation.read',              'Delegations',           'التفويضات',           true),
  ('foundation','foundation.ownership-mapping',       'foundation.group.governance', 12,  '/foundation/ownership-mapping',       'link',         'foundation.read',              'Ownership mapping',     'خرائط الملكية',       true),
  ('foundation','foundation.access-review',           'foundation.group.governance', 13,  '/foundation/access-review',           'shield-check', 'access_review.write',          'Access review',         'مراجعة الصلاحيات',    true),
  ('foundation','foundation.policies',                'foundation.group.governance', 14,  '/foundation/policies',                'file-shield',  'foundation.read',              'Policies',              'السياسات',            true),
  ('foundation','foundation.data-processing',         'foundation.group.governance', 15,  '/foundation/data-processing',         'database',     'foundation.read',              'Data processing',       'معالجة البيانات',     true),
  ('foundation','foundation.reference-data',          'foundation.group.governance', 16,  '/foundation/reference-data',          'list',         'foundation.read',              'Reference data',        'البيانات المرجعية',   true),
  ('foundation','foundation.audit',                   'foundation.group.governance', 17,  '/foundation/audit',                   'history',      'audit_trail.read',             'Audit',                 'التدقيق',             true),
  ('foundation','foundation.settings',                'foundation.group.governance', 18,  '/foundation/settings',                'settings',     'foundation.admin',             'Settings',              'الإعدادات',           true),
  ('foundation','foundation.governance.authority-matrix','foundation.group.governance',100,'/foundation/governance/authority-matrix','grid',      'foundation.governance.read',   'Authority matrix',      'مصفوفة الصلاحيات',    true),
  ('foundation','foundation.governance.coi',          'foundation.group.governance', 110, '/foundation/governance/coi',           'shield',       'foundation.governance.read',   'Conflicts of interest', 'تضارب المصالح',       true),
  ('foundation','foundation.governance.policy-acks',  'foundation.group.governance', 120, '/foundation/governance/policy-acks',   'document',     'foundation.governance.read',   'Policy acknowledgements','إقرارات السياسات',   true),
  ('foundation','foundation.governance.sod-rules',    'foundation.group.governance', 130, '/foundation/governance/sod-rules',     'rule',         'foundation.governance.read',   'SoD rules',             'قواعد فصل المهام',    true),
  ('foundation','foundation.governance.sod-violations','foundation.group.governance',140, '/foundation/governance/sod-violations','alert',        'foundation.governance.read',   'SoD violations',        'مخالفات فصل المهام',  true),
  ('foundation','foundation.access-review.escalations','foundation.group.governance',141, '/foundation/access-review/escalations','warning',     'foundation.access-review.read','Review escalations',    'تصعيدات المراجعة',    true),
  ('foundation','foundation.governance.training',     'foundation.group.governance', 150, '/foundation/governance/training',      'education',    'foundation.governance.read',   'Compliance training',   'التدريب على الامتثال',true),
  ('foundation','foundation.permissions',  'foundation.group.main', 19, '/foundation/permissions',  'key',          'foundation.rbac.read',    'Permissions',         'الصلاحيات',    true),
  ('foundation','foundation.ownership',    'foundation.group.main', 20, '/foundation/ownership',    'chart-arcs',   'foundation.data.read',    'Ownership',           'الملكية',      true),
  ('foundation','foundation.sod',          'foundation.group.main', 21, '/foundation/sod',          'shield-lock',  'foundation.sod.write',    'Segregation of duties','فصل الواجبات',true),
  ('foundation','foundation.hierarchy-viz','foundation.group.main', 22, '/foundation/hierarchy-viz','binary-tree',  'foundation.hierarchy.read','Hierarchy',          'التسلسل',      true),
  ('foundation','foundation.user-lifecycle','foundation.group.main', 23, '/foundation/user-lifecycle','arrow-cycle', 'foundation.user.write',   'User lifecycle',      'دورة حياة المستخدم',true),
  ('foundation','foundation.diagnostics',  'foundation.group.main', 24, '/foundation/diagnostics',  'stethoscope',  'foundation.module.read',  'Diagnostics',         'التشخيص',      true),
  ('foundation','foundation.workflows',    'foundation.group.main',200, '/foundation/workflows',     'flow',         'foundation.workflows.read','Workflows',          'سير العمل',    true),
  ('foundation','foundation.operations-readiness','foundation.group.main',220,'/foundation/operations-readiness','analytics','foundation.diagnostics.read','Operations readiness','الجاهزية التشغيلية',true),
  ('foundation','foundation.records',      'foundation.group.main',230, '/foundation/records',       'list',         'foundation.records.read', 'Records',             'السجلات',      true),
  ('foundation','foundation.reports',      'foundation.group.main',240, '/foundation/reports',       'report',       'foundation.reports.read', 'Reports',             'التقارير',     true),

  -- ── RISK ──
  ('risk','risk.dashboard',   'risk.overview',  10, '/risk/overview',     'layout-dashboard','risk.read',  'Dashboard',    'لوحة المعلومات',true),
  ('risk','risk.register',    'risk.manage',    10, '/risk/register',     'list',            'risk.read',  'Risk Register','سجل المخاطر',   true),
  ('risk','risk.assessments', 'risk.manage',    20, '/risk/assessments',  'clipboard',       'risk.write', 'Assessments',  'التقييمات',     true),
  ('risk','risk.treatments',  'risk.manage',    30, '/risk/treatments',   'shield',          'risk.write', 'Treatments',   'المعالجات',     true),
  ('risk','risk.heatmap',     'risk.analytics', 10, '/risk/heatmap',      'th',              'risk.read',  'Heat Map',     'خريطة الحرارة', true),
  ('risk','risk.trends',      'risk.analytics', 20, '/risk/trends',       'chart-line',      'risk.read',  'Trends',       'الاتجاهات',     true),
  ('risk','risk.reports',     'risk.analytics', 30, '/risk/reports',      'report',          'risk.read',  'Reports',      'التقارير',      true),

  -- ── COMPLIANCE ──
  ('compliance','comp.dashboard',    'compliance.overview',    10, '/compliance/overview',    'layout-dashboard','compliance.read',  'Dashboard',  'لوحة المعلومات',true),
  ('compliance','comp.obligations',  'compliance.obligations', 10, '/compliance/obligations', 'book',            'compliance.read',  'Obligations','الالتزامات',    true),
  ('compliance','comp.attestations', 'compliance.obligations', 20, '/compliance/attestations','verified',        'compliance.write', 'Attestations','المصادقات',    true),
  ('compliance','comp.assessments',  'compliance.testing',     10, '/compliance/assessments', 'clipboard',       'compliance.write', 'Assessments','التقييمات',     true),
  ('compliance','comp.testing',      'compliance.testing',     20, '/compliance/testing',     'check-square',    'compliance.write', 'Testing',    'الاختبار',      true),
  ('compliance','comp.reports',      'compliance.overview',    30, '/compliance/reports',     'report',          'compliance.read',  'Reports',    'التقارير',      true),

  -- ── CONTROLS ──
  ('controls','ctrl.dashboard', 'controls.overview', 10, '/controls/home',    'layout-dashboard','controls.read',  'Dashboard',     'لوحة المعلومات', true),
  ('controls','ctrl.library',   'controls.library',  10, '/controls/library', 'list',            'controls.read',  'Control Library','مكتبة الضوابط',  true),
  ('controls','ctrl.testing',   'controls.library',  20, '/controls/testing', 'check-square',    'controls.write', 'Testing',        'الاختبار',        true),
  ('controls','ctrl.mapping',   'controls.library',  30, '/controls/mapping', 'link',            'controls.write', 'Mapping',        'الربط',           true),

  -- ── POLICY ──
  ('policy','pol.dashboard', 'policy.overview', 10, '/policy/home',     'layout-dashboard','policy.read',  'Dashboard',  'لوحة المعلومات', true),
  ('policy','pol.policies',  'policy.manage',   10, '/policy/library',  'file',            'policy.read',  'Policies',   'السياسات',       true),
  ('policy','pol.drafting',  'policy.manage',   20, '/policy/drafting', 'edit',            'policy.write', 'Drafting',   'الصياغة',        true),
  ('policy','pol.review',    'policy.manage',   30, '/policy/lifecycle','eye',             'policy.write', 'Lifecycle',  'دورة الحياة',    true),

  -- ── AUDIT ──
  ('audit','aud.dashboard',   'audit.overview',    10, '/audit/overview',    'layout-dashboard','audit.read',  'Dashboard',   'لوحة المعلومات',  true),
  ('audit','aud.engagements', 'audit.engagements', 10, '/audit/engagements', 'briefcase',       'audit.read',  'Engagements', 'مهام المراجعة',   true),
  ('audit','aud.findings',    'audit.engagements', 20, '/audit/findings',    'flag',            'audit.write', 'Findings',    'النتائج',         true),
  ('audit','aud.plan',        'audit.engagements', 30, '/audit/plan',        'calendar',        'audit.write', 'Audit Plan',  'خطة التدقيق',     true),
  ('audit','aud.reports',     'audit.overview',    30, '/audit/reports',     'report',          'audit.read',  'Reports',     'التقارير',        true),

  -- ── EVIDENCE ──
  ('evidence','evd.dashboard', 'evidence.overview', 10, '/evidence/overview', 'layout-dashboard','evidence.read',  'Dashboard', 'لوحة المعلومات', true),
  ('evidence','evd.requests',  'evidence.requests', 10, '/evidence/requests', 'inbox',            'evidence.read',  'Requests',  'الطلبات',        true),
  ('evidence','evd.tasks',     'evidence.requests', 20, '/evidence/tasks',    'check-square',     'evidence.write', 'Tasks',     'المهام',         true),
  ('evidence','evd.catalog',   'evidence.requests', 30, '/evidence/catalog',  'list',             'evidence.read',  'Catalog',   'الكتالوج',       true),

  -- ── ISSUES (new) ──
  ('issues','issues.register',    'issues.main', 10, '/issues/register',    'list',         'issues.read',   'Register',    'السجل',     true),
  ('issues','issues.open',        'issues.main', 20, '/issues/open',        'flag',         'issues.read',   'Open Issues', 'المفتوحة',  true),
  ('issues','issues.workflows',   'issues.main', 30, '/issues/workflows',   'flow',         'issues.write',  'Workflows',   'سير العمل', true),
  ('issues','issues.reports',     'issues.main', 40, '/issues/reports',     'report',       'issues.read',   'Reports',     'التقارير',  true),

  -- ── REMEDIATION ──
  ('remediation','rem.register',  'remediation.main', 10, '/remediation/register', 'list',       'remediation.read',  'Register',  'السجل',        true),
  ('remediation','rem.actions',   'remediation.main', 20, '/remediation/actions',  'check',      'remediation.write', 'Actions',   'الإجراءات',    true),
  ('remediation','rem.tracking',  'remediation.main', 30, '/remediation/tracking', 'chart-line', 'remediation.read',  'Tracking',  'المتابعة',     true),

  -- ── INCIDENT ──
  ('incident','inc.register',      'incident.main', 10, '/incident/register',      'list',       'incident.read',  'Register',      'السجل',           true),
  ('incident','inc.investigations','incident.main', 20, '/incident/investigations', 'search',     'incident.write', 'Investigations', 'التحقيقات',      true),
  ('incident','inc.reports',       'incident.main', 30, '/incident/reports',        'report',     'incident.read',  'Reports',        'التقارير',        true),

  -- ── VENDOR ──
  ('vendor','ven.register',    'vendor.main', 10, '/vendor/register',    'list',         'vendor.read',  'Vendors',      'الموردون',     true),
  ('vendor','ven.assessments', 'vendor.main', 20, '/vendor/assessments', 'clipboard',    'vendor.write', 'Assessments',  'التقييمات',    true),
  ('vendor','ven.reports',     'vendor.main', 30, '/vendor/reports',     'report',       'vendor.read',  'Reports',      'التقارير',     true),

  -- ── ASSET ──
  ('asset','ast.register',        'asset.main', 10, '/asset/register',        'list',        'asset.read',  'Assets',         'الأصول',          true),
  ('asset','ast.classification',  'asset.main', 20, '/asset/classification',  'tag',         'asset.write', 'Classification', 'التصنيف',         true),
  ('asset','ast.reports',         'asset.main', 30, '/asset/reports',         'report',      'asset.read',  'Reports',        'التقارير',        true),

  -- ── PRIVACY ──
  ('privacy','prv.register', 'privacy.main', 10, '/privacy/register', 'list',     'privacy.read',  'Register',   'السجل',      true),
  ('privacy','prv.dpia',     'privacy.main', 20, '/privacy/dpia',     'shield',   'privacy.write', 'DPIA',       'تقييم الأثر',true),
  ('privacy','prv.reports',  'privacy.main', 30, '/privacy/reports',  'report',   'privacy.read',  'Reports',    'التقارير',   true),

  -- ── BCP ──
  ('bcp','bcp.plans',   'bcp.main', 10, '/bcp/plans',   'file',       'bcp.read',  'Plans',    'الخطط',      true),
  ('bcp','bcp.drills',  'bcp.main', 20, '/bcp/drills',  'target',     'bcp.write', 'Drills',   'التدريبات',  true),
  ('bcp','bcp.reports', 'bcp.main', 30, '/bcp/reports', 'report',     'bcp.read',  'Reports',  'التقارير',   true),

  -- ── DORA (new) ──
  ('dora','dora.register',  'dora.main', 10, '/dora/register',  'list',       'dora.read',  'Register',  'السجل',      true),
  ('dora','dora.incidents', 'dora.main', 20, '/dora/incidents', 'alert',      'dora.write', 'Incidents', 'الحوادث',    true),
  ('dora','dora.reports',   'dora.main', 30, '/dora/reports',   'report',     'dora.read',  'Reports',   'التقارير',   true),

  -- ── KSA-REGULATORY (new) ──
  ('ksa-regulatory','ksa.obligations', 'ksa-regulatory.main', 10, '/ksa-regulatory/obligations', 'book',    'ksa.read',  'Obligations', 'الالتزامات',true),
  ('ksa-regulatory','ksa.compliance',  'ksa-regulatory.main', 20, '/ksa-regulatory/compliance',  'verified','ksa.write', 'Compliance',  'الامتثال',  true),
  ('ksa-regulatory','ksa.reports',     'ksa-regulatory.main', 30, '/ksa-regulatory/reports',      'report',  'ksa.read',  'Reports',     'التقارير',  true),

  -- ── QIYAS ──
  ('qiyas','qiyas.assessments','qiyas.main', 10, '/qiyas/assessments', 'clipboard', 'qiyas.read',  'Assessments', 'التقييمات',  true),
  ('qiyas','qiyas.journeys',   'qiyas.main', 20, '/qiyas/journeys',    'route',     'qiyas.write', 'Journeys',    'الرحلات',    true),
  ('qiyas','qiyas.reports',    'qiyas.main', 30, '/qiyas/reports',     'report',    'qiyas.read',  'Reports',     'التقارير',   true),

  -- ── ATTESTATION (new) ──
  ('attestation','att.campaigns', 'attestation.main', 10, '/attestation/campaigns', 'megaphone',    'attestation.read',  'Campaigns', 'الحملات',    true),
  ('attestation','att.responses', 'attestation.main', 20, '/attestation/responses', 'check-square', 'attestation.write', 'Responses', 'الردود',     true),
  ('attestation','att.reports',   'attestation.main', 30, '/attestation/reports',   'report',       'attestation.read',  'Reports',   'التقارير',   true),

  -- ── TRAINING ──
  ('training','trn.catalog',     'training.main', 10, '/training/catalog',     'book',         'training.read',  'Catalog',     'الكتالوج',   true),
  ('training','trn.assignments', 'training.main', 20, '/training/assignments', 'check-square', 'training.write', 'Assignments', 'التكليفات',  true),
  ('training','trn.reports',     'training.main', 30, '/training/reports',     'report',       'training.read',  'Reports',     'التقارير',   true),

  -- ── REPORTING ──
  ('reporting','rep.dashboard', 'reporting.overview',   10, '/reports/overview',  'layout-dashboard','reports.read',  'Dashboard',  'لوحة المعلومات', true),
  ('reporting','rep.dashboards','reporting.dashboards', 10, '/reports/dashboards','th-large',         'reports.read',  'Dashboards', 'لوحات المعلومات',true),
  ('reporting','rep.export',    'reporting.dashboards', 20, '/reports/export',    'download',         'reports.write', 'Export',     'تصدير',          true),

  -- ── ANALYTICS ──
  ('analytics','ana.overview', 'analytics.main', 10, '/analytics/overview', 'layout-dashboard','analytics.read',  'Overview',  'نظرة عامة',  true),
  ('analytics','ana.reports',  'analytics.main', 20, '/analytics/reports',  'chart-bar',        'analytics.read',  'Reports',   'التقارير',   true),
  ('analytics','ana.explore',  'analytics.main', 30, '/analytics/explore',  'search',           'analytics.write', 'Explore',   'استكشاف',    true),

  -- ── WORKFLOW ──
  ('workflow','wf.dashboard', 'workflow.overview', 10, '/workflow/hub',       'layout-dashboard','workflow.read',  'Dashboard',   'لوحة المعلومات', true),
  ('workflow','wf.active',    'workflow.active',   10, '/workflow/executions','play',            'workflow.read',  'Active Flows', 'التدفقات النشطة',true),
  ('workflow','wf.templates', 'workflow.active',   20, '/workflow/templates', 'file',            'workflow.write', 'Templates',    'القوالب',        true),
  ('workflow','wf.designer',  'workflow.active',   30, '/workflow/designer',  'pencil',          'workflow.write', 'Designer',     'المصمم',         true),

  -- ── ACTION ──
  ('action','act.register',   'action.main', 10, '/action/register',   'list',         'action.read',  'Actions',    'الإجراءات',    true),
  ('action','act.my-actions', 'action.main', 20, '/action/my-actions', 'user-check',   'action.read',  'My Actions', 'إجراءاتي',     true),
  ('action','act.overdue',    'action.main', 30, '/action/overdue',    'alert',        'action.write', 'Overdue',    'المتأخرة',     true),

  -- ── INBOX (new) ──
  ('inbox','inbox.overview', 'inbox.main', 10, '/inbox',       'inbox',      'inbox.read',  'Inbox',  'صندوق الوارد',true),
  ('inbox','inbox.tasks',    'inbox.main', 20, '/inbox/tasks', 'check-square','inbox.read', 'Tasks',  'المهام',      true),
  ('inbox','inbox.alerts',   'inbox.main', 30, '/inbox/alerts','bell',        'inbox.read', 'Alerts', 'التنبيهات',   true),

  -- ── KNOWLEDGE ──
  ('knowledge','kb.dashboard','knowledge.overview', 10, '/knowledge',          'layout-dashboard','knowledge.read', 'Dashboard', 'لوحة المعلومات', true),
  ('knowledge','kb.articles', 'knowledge.articles', 10, '/knowledge/articles', 'book',            'knowledge.read', 'Articles',  'المقالات',       true),
  ('knowledge','kb.search',   'knowledge.articles', 20, '/knowledge/search',   'search',          'knowledge.read', 'Search',    'البحث',          true),

  -- ── AI-PLATFORM ──
  ('ai-platform','aip.overview', 'ai-platform.main', 10, '/ai-platform/overview', 'layout-dashboard','ai.read',  'Overview',  'نظرة عامة',true),
  ('ai-platform','aip.models',   'ai-platform.main', 20, '/ai-platform/models',   'robot',           'ai.read',  'Models',    'النماذج',  true),
  ('ai-platform','aip.audit',    'ai-platform.main', 30, '/ai-platform/audit',    'history',         'ai.admin', 'Audit',     'التدقيق',  true),

  -- ── AI-OS ──
  ('ai-os','aios.overview', 'ai-os.main', 10, '/ai-os/overview', 'layout-dashboard','ai.read',  'Overview', 'نظرة عامة',true),
  ('ai-os','aios.agents',   'ai-os.main', 20, '/ai-os/agents',   'robot',           'ai.read',  'Agents',   'الوكلاء',  true),
  ('ai-os','aios.audit',    'ai-os.main', 30, '/ai-os/audit',    'history',         'ai.admin', 'Audit',    'التدقيق',  true),

  -- ── AGRC-ENGINE ──
  ('agrc-engine','agrc.overview',    'agrc-engine.main', 10, '/agrc-engine/overview',    'layout-dashboard','agrc.read',  'Overview',    'نظرة عامة',  true),
  ('agrc-engine','agrc.discoveries', 'agrc-engine.main', 20, '/agrc-engine/discoveries', 'search',          'agrc.read',  'Discoveries', 'الاكتشافات', true),
  ('agrc-engine','agrc.audit',       'agrc-engine.main', 30, '/agrc-engine/audit',       'history',         'agrc.admin', 'Audit',       'التدقيق',    true)

ON CONFLICT (module_code, item_id) DO UPDATE SET
  group_id    = EXCLUDED.group_id,
  sort_order  = EXCLUDED.sort_order,
  route       = EXCLUDED.route,
  icon        = EXCLUDED.icon,
  permission  = EXCLUDED.permission,
  label_en    = EXCLUDED.label_en,
  label_ar    = EXCLUDED.label_ar,
  enabled     = EXCLUDED.enabled,
  updated_at  = now();

-- ============================================================
-- PHASE 6 — tenant_module_entitlements: ALL modules ALL tenants
-- 28 business modules × all tenants in dos.tenants
-- Modules: foundation, risk, compliance, controls, policy, audit,
--          evidence, issues, remediation, incident, vendor, asset,
--          privacy, bcp, dora, ksa-regulatory, qiyas, attestation,
--          training, reporting, analytics, workflow, action, inbox,
--          knowledge, ai-platform, ai-os, agrc-engine
-- ============================================================

INSERT INTO dos.tenant_module_entitlements
  (entitlement_id, tenant_id, product_code, module_code,
   entitlement_status, source, limits_json, metadata)
SELECT
  substr(md5(t.tenant_id || '::' || m.product_code || '::' || m.module_code), 1, 32),
  t.tenant_id,
  m.product_code,
  m.module_code,
  'active',
  'platform_dna',
  '{}'::jsonb,
  '{"seededBy":"20260507_2000"}'::jsonb
FROM dos.tenants t
CROSS JOIN (
  VALUES
    ('foundation',     'foundation'),
    ('risk',           'agrc'),
    ('compliance',     'agrc'),
    ('controls',       'agrc'),
    ('policy',         'agrc'),
    ('audit',          'agrc'),
    ('evidence',       'agrc'),
    ('issues',         'agrc'),
    ('remediation',    'agrc'),
    ('incident',       'agrc'),
    ('vendor',         'agrc'),
    ('asset',          'agrc'),
    ('privacy',        'agrc'),
    ('bcp',            'agrc'),
    ('dora',           'agrc'),
    ('ksa-regulatory', 'agrc'),
    ('qiyas',          'agrc'),
    ('attestation',    'agrc'),
    ('training',       'agrc'),
    ('reporting',      'platform'),
    ('analytics',      'platform'),
    ('workflow',       'platform'),
    ('action',         'agrc'),
    ('inbox',          'agrc'),
    ('knowledge',      'platform'),
    ('ai-platform',    'platform'),
    ('ai-os',          'platform'),
    ('agrc-engine',    'platform')
) AS m(module_code, product_code)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PHASE 7 — workspace_shell_binding: fix 2 under-provisioned tenants
-- Tenants 65f10f855eab8b30 and 6caee2135aeb8236 are missing 6 shell keys
-- ============================================================

INSERT INTO dos.workspace_shell_binding
  (tenant_id, component_key, enabled, position, perms_required, props)
SELECT
  t.tenant_id,
  s.component_key,
  true,
  s.position,
  '{}'::text[],
  s.props::jsonb
FROM (VALUES
  ('65f10f855eab8b30'),
  ('6caee2135aeb8236')
) AS t(tenant_id)
CROSS JOIN (VALUES
  ('workspace.shell.brand',           100, '{"zone":"header","homeRoute":"/workspace-home"}'),
  ('workspace.shell.workspace-title', 101, '{"zone":"header","homeRoute":"/workspace-home"}'),
  ('workspace.shell.settings-action', 103, '{"icon":"settings","zone":"header","ariaLabel":"Settings"}'),
  ('workspace.shell.user-menu',       104, '{"zone":"header","label":"Account","ariaLabel":"Account"}'),
  ('workspace.shell.sidebar-nav',     110, '{"zone":"sidebar","items":[],"policy":{"defaultRoute":"/foundation/overview","expandActiveOnly":true,"defaultModuleCode":"foundation"}}'),
  ('workspace.shell.module-cards',    121, '{"zone":"main","items":[]}')
) AS s(component_key, position, props)
ON CONFLICT (tenant_id, component_key) DO NOTHING;

-- ============================================================
-- PHASE 8 — sidebar-nav policy: update defaultRoute for ALL tenants
-- Ensure foundation is default landing + expandActiveOnly enforced
-- ============================================================

UPDATE dos.workspace_shell_binding
SET
  props = jsonb_set(
    jsonb_set(
      props,
      '{policy,defaultRoute}',
      '"/foundation/overview"'::jsonb
    ),
    '{policy,defaultModuleCode}',
    '"foundation"'::jsonb
  ),
  updated_at = now()
WHERE component_key = 'workspace.shell.sidebar-nav'
  AND (
    props -> 'policy' IS NULL
    OR props -> 'policy' ->> 'defaultRoute' IS DISTINCT FROM '/foundation/overview'
  );

-- ============================================================
-- PHASE 9 — Post-assertion proof
-- ============================================================

DO $$
DECLARE
  v_module_count     int;
  v_group_count      int;
  v_item_count       int;
  v_entitlement_rows int;
  v_binding_tenants  int;
BEGIN
  SELECT COUNT(*) INTO v_module_count
    FROM dos.module_registry WHERE status = 'active';

  SELECT COUNT(*) INTO v_group_count
    FROM dos.ui_module_nav_group;

  SELECT COUNT(*) INTO v_item_count
    FROM dos.ui_module_nav_item;

  SELECT COUNT(*) INTO v_entitlement_rows
    FROM dos.tenant_module_entitlements
   WHERE entitlement_status = 'active'
     AND module_code IN (
       'foundation','risk','compliance','controls','policy','audit','evidence',
       'issues','remediation','incident','vendor','asset','privacy','bcp',
       'dora','ksa-regulatory','qiyas','attestation','training','reporting',
       'analytics','workflow','action','inbox','knowledge',
       'ai-platform','ai-os','agrc-engine'
     );

  SELECT COUNT(DISTINCT tenant_id) INTO v_binding_tenants
    FROM dos.workspace_shell_binding
   WHERE component_key = 'workspace.shell.sidebar-nav';

  RAISE NOTICE '=== 20260507_2000 POST-ASSERTION ===';
  RAISE NOTICE 'Active modules in registry : %', v_module_count;
  RAISE NOTICE 'Nav groups total            : %', v_group_count;
  RAISE NOTICE 'Nav items total             : %', v_item_count;
  RAISE NOTICE 'Active entitlement rows     : %', v_entitlement_rows;
  RAISE NOTICE 'Tenants with sidebar-nav    : %', v_binding_tenants;

  IF v_module_count < 28 THEN
    RAISE EXCEPTION 'Expected ≥28 active modules, got %', v_module_count;
  END IF;
  IF v_group_count < 40 THEN
    RAISE EXCEPTION 'Expected ≥40 nav groups, got %', v_group_count;
  END IF;
  IF v_item_count < 100 THEN
    RAISE EXCEPTION 'Expected ≥100 nav items, got %', v_item_count;
  END IF;
  IF v_binding_tenants < 44 THEN
    RAISE EXCEPTION 'Expected ≥44 tenants with sidebar-nav binding, got %', v_binding_tenants;
  END IF;

  RAISE NOTICE '=== ALL ASSERTIONS PASSED ===';
END;
$$;

COMMIT;
