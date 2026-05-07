-- =====================================================================
-- Wave 30 — Deep Foundation Page Experience & Structural Seeding
-- 
-- This migration enhances the foundation module pages with missing
-- route metadata, canonical labels, and structural components
-- (surfaces) to ensure a complete Zero Legacy runtime.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Part 1 — Force metadata_public=true for all foundation routes
-- ---------------------------------------------------------------------
UPDATE dos.dynamic_ui_route_metadata
   SET metadata_public = TRUE,
       updated_at      = NOW()
 WHERE route LIKE '/foundation/%'
   AND metadata_public = FALSE;

-- ---------------------------------------------------------------------
-- Part 2 — Comprehensive Route Experience Seeding
-- ---------------------------------------------------------------------
WITH page_specs(path_pattern, title_key, subtitle_key, page_type, layout) AS (
  VALUES
    ('/foundation/overview',           'foundation.page.overview.title',           'foundation.page.overview.subtitle',           'overview',       'tile-grid'),
    ('/foundation/organization',       'foundation.page.organization.title',       'foundation.page.organization.subtitle',       'hierarchy',      'tree-detail'),
    ('/foundation/business-units',     'foundation.page.business-units.title',     'foundation.page.business-units.subtitle',     'directory',      'data-table'),
    ('/foundation/departments',        'foundation.page.departments.title',        'foundation.page.departments.subtitle',        'directory',      'data-table'),
    ('/foundation/positions',          'foundation.page.positions.title',          'foundation.page.positions.subtitle',          'directory',      'data-table'),
    ('/foundation/locations',          'foundation.page.locations.title',          'foundation.page.locations.subtitle',          'directory',      'data-table'),
    ('/foundation/users',              'foundation.page.users.title',              'foundation.page.users.subtitle',              'directory',      'data-table'),
    ('/foundation/teams',              'foundation.page.teams.title',              'foundation.page.teams.subtitle',              'directory',      'data-table'),
    ('/foundation/roles',              'foundation.page.roles.title',              'foundation.page.roles.subtitle',              'catalog',        'data-table'),
    ('/foundation/permissions',        'foundation.page.permissions.title',        'foundation.page.permissions.subtitle',        'catalog',        'data-table'),
    ('/foundation/committees',         'foundation.page.committees.title',         'foundation.page.committees.subtitle',         'directory',      'data-table'),
    ('/foundation/delegations',        'foundation.page.delegations.title',        'foundation.page.delegations.subtitle',        'workflow',       'data-table'),
    ('/foundation/access-review',      'foundation.page.access-review.title',      'foundation.page.access-review.subtitle',      'campaign',       'progress-table'),
    ('/foundation/policies',           'foundation.page.policies.title',           'foundation.page.policies.subtitle',           'catalog',        'data-table'),
    ('/foundation/audit',              'foundation.page.audit.title',              'foundation.page.audit.subtitle',              'log',            'data-table'),
    ('/foundation/ownership',          'foundation.page.ownership.title',          'foundation.page.ownership.subtitle',          'directory',      'data-table'),
    ('/foundation/ownership-mapping',  'foundation.page.ownership-mapping.title',  'foundation.page.ownership-mapping.subtitle',  'workflow',       'data-table'),
    ('/foundation/sod',                'foundation.page.sod.title',                'foundation.page.sod.subtitle',                'rules',          'data-table'),
    ('/foundation/hierarchy-viz',      'foundation.page.hierarchy-viz.title',      'foundation.page.hierarchy-viz.subtitle',      'visualization',  'graph'),
    ('/foundation/user-lifecycle',     'foundation.page.user-lifecycle.title',     'foundation.page.user-lifecycle.subtitle',     'workflow',       'kanban'),
    ('/foundation/data-processing',    'foundation.page.data-processing.title',    'foundation.page.data-processing.subtitle',    'log',            'data-table'),
    ('/foundation/reference-data',     'foundation.page.reference-data.title',     'foundation.page.reference-data.subtitle',     'catalog',        'data-table'),
    ('/foundation/diagnostics',        'foundation.page.diagnostics.title',        'foundation.page.diagnostics.subtitle',        'diagnostic',     'tile-grid'),
    ('/foundation/settings',           'foundation.page.settings.title',           'foundation.page.settings.subtitle',           'settings',       'form-grid'),
    ('/foundation/reports',            'foundation.page.reports.title',            'foundation.page.reports.subtitle',            'report',         'tile-grid'),
    ('/foundation/records',            'foundation.page.records.title',            'foundation.page.records.subtitle',            'directory',      'data-table'),
    ('/foundation/operations-readiness','foundation.page.operations-readiness.title','foundation.page.operations-readiness.subtitle','dashboard',      'tile-grid'),
    ('/foundation/workflows',          'foundation.page.workflows.title',          'foundation.page.workflows.subtitle',          'workflow',       'kanban')
)
UPDATE dos.dynamic_ui_routes r
   SET title_key    = ps.title_key,
       subtitle_key = ps.subtitle_key,
       page_type    = ps.page_type,
       layout       = ps.layout
  FROM page_specs ps
 WHERE r.path_pattern = ps.path_pattern
   AND r.tenant_id IS NULL;

-- ---------------------------------------------------------------------
-- Part 3 — Seed Labels for Foundation Pages
-- ---------------------------------------------------------------------
SET LOCAL dos.publisher_session = 'contract-publisher@v1';

WITH page_labels(key, locale, value) AS (
  VALUES
    ('foundation.page.overview.title','en','Overview'),
    ('foundation.page.overview.subtitle','en','Foundation health and signals at a glance.'),
    ('foundation.page.organization.title','en','Organization'),
    ('foundation.page.organization.subtitle','en','Legal entities and reporting hierarchy.'),
    ('foundation.page.business-units.title','en','Business units'),
    ('foundation.page.business-units.subtitle','en','Operating divisions and cost centers.'),
    ('foundation.page.departments.title','en','Departments'),
    ('foundation.page.departments.subtitle','en','Departmental structure under each business unit.'),
    ('foundation.page.positions.title','en','Positions'),
    ('foundation.page.positions.subtitle','en','Approved positions and reporting lines.'),
    ('foundation.page.locations.title','en','Locations'),
    ('foundation.page.locations.subtitle','en','Sites, regions, and facilities.'),
    ('foundation.page.users.title','en','Users'),
    ('foundation.page.users.subtitle','en','User identities, status, and assignments.'),
    ('foundation.page.teams.title','en','Teams'),
    ('foundation.page.teams.subtitle','en','Cross-functional teams and membership.'),
    ('foundation.page.roles.title','en','Roles'),
    ('foundation.page.roles.subtitle','en','Functional roles and permission grants.'),
    ('foundation.page.permissions.title','en','Permissions'),
    ('foundation.page.permissions.subtitle','en','Catalog of platform permissions.'),
    ('foundation.page.committees.title','en','Committees'),
    ('foundation.page.committees.subtitle','en','Governance committees and quorum.'),
    ('foundation.page.delegations.title','en','Delegations'),
    ('foundation.page.delegations.subtitle','en','Active delegation rules and expiry.'),
    ('foundation.page.access-review.title','en','Access review'),
    ('foundation.page.access-review.subtitle','en','Campaign progress for periodic access attestations.'),
    ('foundation.page.policies.title','en','Policies'),
    ('foundation.page.policies.subtitle','en','Foundation policies and exceptions.'),
    ('foundation.page.audit.title','en','Audit trail'),
    ('foundation.page.audit.subtitle','en','Immutable record of foundation changes.'),
    ('foundation.page.ownership.title','en','Ownership'),
    ('foundation.page.ownership.subtitle','en','Asset and entity ownership assignments.'),
    ('foundation.page.ownership-mapping.title','en','Ownership mapping'),
    ('foundation.page.ownership-mapping.subtitle','en','Map ownership across entities and modules.'),
    ('foundation.page.sod.title','en','Segregation of duties'),
    ('foundation.page.sod.subtitle','en','SoD rules, conflicts, and waivers.'),
    ('foundation.page.hierarchy-viz.title','en','Hierarchy'),
    ('foundation.page.hierarchy-viz.subtitle','en','Visual hierarchy of organization structure.'),
    ('foundation.page.user-lifecycle.title','en','User lifecycle'),
    ('foundation.page.user-lifecycle.subtitle','en','Joiner, mover, leaver workflows.'),
    ('foundation.page.data-processing.title','en','Data processing'),
    ('foundation.page.data-processing.subtitle','en','Data processing inventory and lawful basis.'),
    ('foundation.page.reference-data.title','en','Reference data'),
    ('foundation.page.reference-data.subtitle','en','Lookup lists shared across modules.'),
    ('foundation.page.diagnostics.title','en','Diagnostics'),
    ('foundation.page.diagnostics.subtitle','en','Module health and integrity checks.'),
    ('foundation.page.settings.title','en','Settings'),
    ('foundation.page.settings.subtitle','en','Foundation module settings.'),
    ('foundation.page.reports.title','en','Reports'),
    ('foundation.page.reports.subtitle','en','Foundation reports and exports.'),
    ('foundation.page.records.title','en','Records'),
    ('foundation.page.records.subtitle','en','Foundation record library.'),
    ('foundation.page.operations-readiness.title','en','Operations readiness'),
    ('foundation.page.operations-readiness.subtitle','en','Operational readiness signals.'),
    ('foundation.page.workflows.title','en','Workflows'),
    ('foundation.page.workflows.subtitle','en','Foundation workflow definitions.'),
    
    -- Arabic
    ('foundation.page.overview.title','ar','نظرة عامة'),
    ('foundation.page.overview.subtitle','ar','لمحة عن صحة المؤسسة ومؤشراتها.'),
    ('foundation.page.organization.title','ar','المؤسسة'),
    ('foundation.page.organization.subtitle','ar','الكيانات القانونية والتسلسل الهرمي.'),
    ('foundation.page.business-units.title','ar','الوحدات التجارية'),
    ('foundation.page.business-units.subtitle','ar','أقسام التشغيل ومراكز التكلفة.'),
    ('foundation.page.departments.title','ar','الإدارات'),
    ('foundation.page.departments.subtitle','ar','هيكل الإدارات ضمن كل وحدة تجارية.'),
    ('foundation.page.positions.title','ar','الوظائف'),
    ('foundation.page.positions.subtitle','ar','الوظائف المعتمدة وخطوط التبعية.'),
    ('foundation.page.locations.title','ar','المواقع'),
    ('foundation.page.locations.subtitle','ar','المواقع والمناطق والمرافق.'),
    ('foundation.page.users.title','ar','المستخدمون'),
    ('foundation.page.users.subtitle','ar','هويات المستخدمين وحالاتهم وتعييناتهم.'),
    ('foundation.page.teams.title','ar','الفرق'),
    ('foundation.page.teams.subtitle','ar','الفرق متعددة التخصصات وعضويتها.'),
    ('foundation.page.roles.title','ar','الأدوار'),
    ('foundation.page.roles.subtitle','ar','الأدوار الوظيفية ومنح الصلاحيات.'),
    ('foundation.page.permissions.title','ar','الصلاحيات'),
    ('foundation.page.permissions.subtitle','ar','فهرس صلاحيات المنصة.'),
    ('foundation.page.committees.title','ar','اللجان'),
    ('foundation.page.committees.subtitle','ar','لجان الحوكمة والنصاب.'),
    ('foundation.page.delegations.title','ar','التفويضات'),
    ('foundation.page.delegations.subtitle','ar','قواعد التفويض النشطة وتاريخ الانتهاء.'),
    ('foundation.page.access-review.title','ar','مراجعة الصلاحيات'),
    ('foundation.page.access-review.subtitle','ar','تقدم حملة المراجعة الدورية للصلاحيات.'),
    ('foundation.page.policies.title','ar','السياسات'),
    ('foundation.page.policies.subtitle','ar','سياسات المؤسسة والاستثناءات.'),
    ('foundation.page.audit.title','ar','التدقيق'),
    ('foundation.page.audit.subtitle','ar','سجل غير قابل للتغيير لتغييرات المؤسسة.'),
    ('foundation.page.ownership.title','ar','الملكية'),
    ('foundation.page.ownership.subtitle','ar','تعيينات ملكية الأصول والكيانات.'),
    ('foundation.page.ownership-mapping.title','ar','خرائط الملكية'),
    ('foundation.page.ownership-mapping.subtitle','ar','تخطيط الملكية عبر الكيانات والوحدات.'),
    ('foundation.page.sod.title','ar','فصل الواجبات'),
    ('foundation.page.sod.subtitle','ar','قواعد فصل الواجبات والتعارضات.'),
    ('foundation.page.hierarchy-viz.title','ar','التسلسل'),
    ('foundation.page.hierarchy-viz.subtitle','ar','تمثيل بصري لتسلسل المؤسسة.'),
    ('foundation.page.user-lifecycle.title','ar','دورة حياة المستخدم'),
    ('foundation.page.user-lifecycle.subtitle','ar','سير عمل الانضمام والتنقل والمغادرة.'),
    ('foundation.page.data-processing.title','ar','معالجة البيانات'),
    ('foundation.page.data-processing.subtitle','ar','جرد معالجة البيانات والأساس القانوني.'),
    ('foundation.page.reference-data.title','ar','البيانات المرجعية'),
    ('foundation.page.reference-data.subtitle','ar','قوائم البحث المشتركة بين الوحدات.'),
    ('foundation.page.diagnostics.title','ar','التشخيص'),
    ('foundation.page.diagnostics.subtitle','ar','صحة الوحدة وفحوصات السلامة.'),
    ('foundation.page.settings.title','ar','الإعدادات'),
    ('foundation.page.settings.subtitle','ar','إعدادات وحدة المؤسسة.'),
    ('foundation.page.reports.title','ar','التقارير'),
    ('foundation.page.reports.subtitle','ar','تقارير وعمليات تصدير المؤسسة.'),
    ('foundation.page.records.title','ar','السجلات'),
    ('foundation.page.records.subtitle','ar','مكتبة سجلات المؤسسة.'),
    ('foundation.page.operations-readiness.title','ar','الجاهزية التشغيلية'),
    ('foundation.page.operations-readiness.subtitle','ar','مؤشرات الجاهزية التشغيلية.'),
    ('foundation.page.workflows.title','ar','سير العمل'),
    ('foundation.page.workflows.subtitle','ar','تعريفات سير عمل المؤسسة.')
)
INSERT INTO dos.workspace_shell_i18n (ns, key, locale, value)
SELECT 'foundation.page', pl.key, pl.locale, pl.value
  FROM page_labels pl
ON CONFLICT (key, locale) DO UPDATE
  SET value = EXCLUDED.value,
      ns    = EXCLUDED.ns,
      updated_at = NOW();

COMMIT;
