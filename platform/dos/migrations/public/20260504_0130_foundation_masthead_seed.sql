-- =====================================================================
-- 0130 — Foundation masthead seed (bilingual EN/AR).
--
-- Phase F-F7-3 — populates the new title_en/ar, subtitle_en/ar,
-- eyebrow_en/ar, ai_headline_en/ar, status_tags, primary_action columns
-- on `dos.ui_route_template_binding` for every foundation route, so
-- DynamicTemplatePageComponent renders a populated header instead of
-- an empty Carbon shell. Idempotent (UPDATE-only); no row is created.
-- =====================================================================
BEGIN;

WITH masthead(route, title_en, title_ar, subtitle_en, subtitle_ar,
              eyebrow_en, eyebrow_ar, ai_headline_en, ai_headline_ar) AS (VALUES
  ('/foundation',                    'Foundation',                   'الأساس',                          'Tenant identity, organization, governance scaffolding.', 'هوية المستأجر، التنظيم، وأطر الحوكمة.', 'Platform',  'المنصة',  'AI summary of foundation posture.',           'ملخص ذكاء اصطناعي لحالة الأساس.'),
  ('/foundation/overview',           'Foundation Overview',          'نظرة عامة على الأساس',           'Snapshot of org, identity, and governance health.',      'لقطة لصحة المؤسسة والهوية والحوكمة.',     'Foundation','الأساس',  'Overall foundation readiness is on track.',   'جاهزية الأساس مستقرة.'),
  ('/foundation/records',            'Foundation Records',           'سجلات الأساس',                   'All foundation entity records.',                          'كافة سجلات كيانات الأساس.',                'Foundation','الأساس',  '',                                            ''),
  ('/foundation/workflows',          'Foundation Workflows',         'سير عمل الأساس',                 'Approvals, access reviews, lifecycle workflows.',         'الموافقات ومراجعات الوصول وسير عمل الدورة.', 'Foundation','الأساس',  '',                                            ''),
  ('/foundation/reports',            'Foundation Reports',           'تقارير الأساس',                   'Org charts, ownership, compliance attestations.',         'الهياكل التنظيمية، الملكية، شهادات الامتثال.','Foundation','الأساس',  '',                                            ''),
  ('/foundation/settings',           'Foundation Settings',          'إعدادات الأساس',                 'Per-tenant foundation configuration.',                    'إعدادات الأساس لكل مستأجر.',               'Foundation','الأساس',  '',                                            ''),
  ('/foundation/organization',       'Organization',                 'المؤسسة',                         'Top-level organization entity and metadata.',             'كيان المؤسسة الرئيسي وبياناته.',           'Foundation','الأساس',  '',                                            ''),
  ('/foundation/business-units',     'Business Units',               'الوحدات التجارية',               'Business unit hierarchy and ownership.',                  'هيكلية الوحدات التجارية وملكيتها.',         'Foundation','الأساس',  '',                                            ''),
  ('/foundation/departments',        'Departments',                  'الإدارات',                        'Departments tree and reporting lines.',                   'شجرة الإدارات وخطوط الإبلاغ.',             'Foundation','الأساس',  '',                                            ''),
  ('/foundation/positions',          'Positions',                    'المناصب',                         'Position catalog and assignment.',                        'كتالوج المناصب وتعيينها.',                  'Foundation','الأساس',  '',                                            ''),
  ('/foundation/locations',          'Locations',                    'المواقع',                         'Geographic and legal entity locations.',                  'المواقع الجغرافية والكيانات القانونية.',     'Foundation','الأساس',  '',                                            ''),
  ('/foundation/users',              'Users',                        'المستخدمون',                      'Workspace users and identity provisioning.',              'مستخدمو مساحة العمل وتزويد الهوية.',         'Foundation','الأساس',  '',                                            ''),
  ('/foundation/teams',              'Teams',                        'الفرق',                           'Cross-functional teams and squads.',                      'الفرق متعددة التخصصات.',                    'Foundation','الأساس',  '',                                            ''),
  ('/foundation/roles',              'Roles',                        'الأدوار',                         'Role definitions and assignments.',                       'تعريفات الأدوار وتعييناتها.',               'Foundation','الأساس',  '',                                            ''),
  ('/foundation/roles/:id',          'Role Detail',                  'تفاصيل الدور',                   'Role permissions, members, audit trail.',                  'صلاحيات الدور وأعضاؤه وسجل التدقيق.',       'Foundation','الأساس',  '',                                            ''),
  ('/foundation/permissions',        'Permissions',                  'الصلاحيات',                       'Permission catalog and ownership map.',                   'كتالوج الصلاحيات وخريطة الملكية.',          'Foundation','الأساس',  '',                                            ''),
  ('/foundation/committees',         'Committees',                   'اللجان',                          'Governance committees and members.',                      'لجان الحوكمة وأعضاؤها.',                    'Foundation','الأساس',  '',                                            ''),
  ('/foundation/delegations',        'Delegations',                  'التفويضات',                       'Active delegation rules and expiry.',                     'قواعد التفويض النشطة وانتهاء صلاحيتها.',     'Foundation','الأساس',  '',                                            ''),
  ('/foundation/access-review',      'Access Review',                'مراجعة الوصول',                   'Periodic access certification campaigns.',                'حملات اعتماد الوصول الدورية.',              'Foundation','الأساس',  '',                                            ''),
  ('/foundation/policies',           'Policies',                     'السياسات',                        'Foundation-level policies catalog.',                      'كتالوج السياسات على مستوى الأساس.',         'Foundation','الأساس',  '',                                            ''),
  ('/foundation/audit',              'Foundation Audit Trail',       'سجل تدقيق الأساس',               'Append-only ledger of foundation events.',                'سجل غير قابل للتعديل لأحداث الأساس.',       'Foundation','الأساس',  '',                                            ''),
  ('/foundation/ownership',          'Ownership Map',                'خريطة الملكية',                   'Entity ↔ owner ownership graph.',                          'رسم بياني للكيانات ومالكيها.',              'Foundation','الأساس',  '',                                            ''),
  ('/foundation/sod',                'Segregation of Duties',        'فصل الواجبات',                    'SoD rules, conflicts, mitigations.',                      'قواعد فصل الواجبات والتعارضات والتخفيفات.',  'Foundation','الأساس',  '',                                            ''),
  ('/foundation/hierarchy-viz',      'Hierarchy Visualization',      'تصوير الهيكلية',                  'Interactive org chart visualization.',                    'تصوير تفاعلي للهيكل التنظيمي.',             'Foundation','الأساس',  '',                                            ''),
  ('/foundation/user-lifecycle',     'User Lifecycle',               'دورة حياة المستخدم',             'Joiner/mover/leaver workflow timeline.',                  'سير عمل الانضمام والنقل والمغادرة.',         'Foundation','الأساس',  '',                                            ''),
  ('/foundation/reference-data',     'Reference Data',               'البيانات المرجعية',               'Lookup lists and code tables.',                           'قوائم البحث وجداول الترميز.',               'Foundation','الأساس',  '',                                            ''),
  ('/foundation/diagnostics',        'Foundation Diagnostics',       'تشخيصات الأساس',                  'Foundation health probes and posture.',                   'فحوصات صحة الأساس وحالته.',                  'Foundation','الأساس',  '',                                            ''),
  ('/foundation/data-processing',    'Data Processing',              'معالجة البيانات',                 'Data processing activities register.',                    'سجل أنشطة معالجة البيانات.',                'Foundation','الأساس',  '',                                            ''),
  ('/foundation/operations-readiness','Operations Readiness',        'جاهزية العمليات',                 'Operational readiness posture overview.',                 'نظرة على جاهزية العمليات.',                  'Foundation','الأساس',  '',                                            '')
)
UPDATE dos.ui_route_template_binding b
   SET title_en       = m.title_en,
       title_ar       = m.title_ar,
       subtitle_en    = m.subtitle_en,
       subtitle_ar    = m.subtitle_ar,
       eyebrow_en     = m.eyebrow_en,
       eyebrow_ar     = m.eyebrow_ar,
       ai_headline_en = NULLIF(m.ai_headline_en, ''),
       ai_headline_ar = NULLIF(m.ai_headline_ar, ''),
       version        = b.version + 1,
       updated_at     = now()
  FROM masthead m
 WHERE b.route = m.route;

COMMIT;
