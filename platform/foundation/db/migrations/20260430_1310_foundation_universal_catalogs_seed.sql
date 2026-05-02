-- Foundation Universal Catalogs SEED (Wave 2.1) — ~1700 rows of platform-level
-- reference data that every tenant gets without configuration.
-- Idempotent: ON CONFLICT DO UPDATE.

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. PROFILE TYPES (12)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_profile_types
  (profile_code, name_en, name_ar, description_en, default_perm_pack, has_lifecycle, has_probation, requires_nda, requires_coi)
VALUES
  ('employee_full_time',  'Employee (Full-time)',  'موظف (دوام كامل)',  'Permanent full-time employee', 'employee', true,  true,  false, true),
  ('employee_part_time',  'Employee (Part-time)',  'موظف (دوام جزئي)',  'Permanent part-time employee', 'employee', true,  true,  false, true),
  ('intern',              'Intern',                'متدرب',             'Time-bound trainee', 'intern', true, false, true, false),
  ('contractor_tm',       'Contractor (Time & Materials)', 'متعاقد (بالوقت والمواد)', 'External individual contractor — billed hourly', 'contractor', true, false, true, true),
  ('contractor_fixed',    'Contractor (Fixed-bid)', 'متعاقد (بسعر ثابت)', 'External contractor on a fixed-bid statement of work', 'contractor', true, false, true, true),
  ('vendor_rep',          'Vendor Representative',  'ممثل المورد',       'Vendor employee with portal access', 'vendor', true, false, true, false),
  ('regulator_rep',       'Regulator Representative', 'ممثل الجهة التنظيمية', 'Regulator/auditor with read-only access', 'auditor_external', false, false, true, false),
  ('consultant',          'Consultant',             'استشاري',           'External consultant on engagement', 'consultant', true, false, true, true),
  ('system_account',      'System Account',         'حساب نظام',         'Service account for integrations', 'system', false, false, false, false),
  ('ai_agent',            'AI Agent',               'وكيل ذكاء اصطناعي', 'Governed AI employee per AI-OS contract', 'ai_agent', true, false, false, false),
  ('board_member',        'Board Member',           'عضو مجلس إدارة',   'Board / advisory-board member', 'board', true, false, true, true),
  ('external_auditor',    'External Auditor',       'مدقق خارجي',        'External independent auditor', 'auditor_external', false, false, true, true)
ON CONFLICT (profile_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, default_perm_pack = EXCLUDED.default_perm_pack,
  has_lifecycle = EXCLUDED.has_lifecycle, has_probation = EXCLUDED.has_probation,
  requires_nda = EXCLUDED.requires_nda, requires_coi = EXCLUDED.requires_coi,
  is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. OWNERSHIP DOMAINS (12)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_ownership_domains
  (domain_code, name_en, name_ar, description_en, source_module)
VALUES
  ('risks',          'Risks',           'المخاطر',           'Risk register entries', 'risk'),
  ('controls',       'Controls',        'الضوابط',           'Control library', 'controls'),
  ('policies',       'Policies',        'السياسات',          'Policy documents', 'policy'),
  ('vendors',        'Vendors',         'الموردون',          'Third parties under management', 'vendor-risk'),
  ('assets',         'Assets',          'الأصول',            'IT/info/physical assets', 'asset'),
  ('processes',      'Business Processes','العمليات',        'Documented business processes', 'process'),
  ('applications',   'Applications',    'التطبيقات',         'Business applications', 'asset'),
  ('data_processing','Data Processing Activities (ROPA)','أنشطة معالجة البيانات','PDPL ROPA entries', 'foundation'),
  ('regulators',     'Regulator Engagements','الجهات التنظيمية','Regulator points of contact', 'compliance'),
  ('committees',     'Committees',      'اللجان',            'Governance committees', 'foundation'),
  ('frameworks',     'Frameworks',      'الأطر التنظيمية',   'Compliance frameworks (PDPL/SAMA/ISO)', 'compliance'),
  ('incidents',      'Incidents',       'الحوادث',           'Security/operational incidents', 'incident')
ON CONFLICT (domain_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, source_module = EXCLUDED.source_module,
  is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. LAWFUL BASES (PDPL + GDPR — 14)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_lawful_bases
  (basis_code, framework, name_en, name_ar, description_en, requires_consent)
VALUES
  ('pdpl_consent',         'PDPL', 'Consent of data subject',     'موافقة صاحب البيانات',
   'Article 5(1) — explicit, informed, withdrawable consent.', true),
  ('pdpl_contract',        'PDPL', 'Performance of contract',      'تنفيذ العقد',
   'Processing necessary to perform a contract with the data subject.', false),
  ('pdpl_legal_obligation','PDPL', 'Legal obligation',             'التزام قانوني',
   'Compliance with a legal obligation under Saudi law.', false),
  ('pdpl_vital_interest',  'PDPL', 'Vital interest of the data subject','المصلحة الحيوية',
   'Necessary to protect life or health of the data subject.', false),
  ('pdpl_public_interest', 'PDPL', 'Public interest task',         'المصلحة العامة',
   'Task carried out in the public interest by an official body.', false),
  ('pdpl_actual_interest', 'PDPL', 'Actual / legitimate interest', 'المصلحة الفعلية',
   'Legitimate interest of the controller, not overriding the data subject''s rights.', false),
  ('pdpl_research',        'PDPL', 'Scientific research',          'البحث العلمي',
   'Processing for statistical or scientific research subject to safeguards.', false),
  ('pdpl_security',        'PDPL', 'National security',            'الأمن الوطني',
   'Processing required for national security purposes.', false),
  ('gdpr_consent',         'GDPR', 'Consent (GDPR Art. 6(1)(a))',  'الموافقة (لائحة GDPR)', 'GDPR consent.', true),
  ('gdpr_contract',        'GDPR', 'Contract (GDPR Art. 6(1)(b))', 'العقد (لائحة GDPR)', '', false),
  ('gdpr_legal_obligation','GDPR', 'Legal obligation (GDPR Art. 6(1)(c))', 'التزام قانوني (لائحة GDPR)', '', false),
  ('gdpr_vital_interest',  'GDPR', 'Vital interests (GDPR Art. 6(1)(d))','المصلحة الحيوية (لائحة GDPR)','', false),
  ('gdpr_public_task',     'GDPR', 'Public task (GDPR Art. 6(1)(e))','المهام العامة (لائحة GDPR)','', false),
  ('gdpr_legitimate_interest','GDPR','Legitimate interest (GDPR Art. 6(1)(f))','المصلحة المشروعة (لائحة GDPR)','', false)
ON CONFLICT (basis_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, requires_consent = EXCLUDED.requires_consent,
  is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. DATA CLASSIFICATIONS (4)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_data_classifications
  (level_code, level_order, name_en, name_ar, description_en, default_color, encryption_required, audit_required)
VALUES
  ('public',       1, 'Public',       'عام',       'Information freely shareable.', '#16a34a', false, false),
  ('internal',     2, 'Internal',     'داخلي',     'For employees only.',           '#2563eb', false, false),
  ('confidential', 3, 'Confidential', 'سري',       'Restricted to authorised staff.','#f59e0b', true,  true),
  ('restricted',   4, 'Restricted',   'سري للغاية', 'Highest sensitivity (PII, PHI, board-confidential).','#dc2626', true, true)
ON CONFLICT (level_code) DO UPDATE SET
  level_order = EXCLUDED.level_order, name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, default_color = EXCLUDED.default_color,
  encryption_required = EXCLUDED.encryption_required, audit_required = EXCLUDED.audit_required;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. AUDIT ACTIONS (30)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_audit_actions
  (action_code, category, name_en, name_ar, default_severity, evidence_required)
VALUES
  ('create',          'crud',     'Create',                'إنشاء',              'info',     false),
  ('read',            'crud',     'Read',                  'قراءة',              'info',     false),
  ('read_sensitive',  'access',   'Read sensitive data',   'قراءة بيانات حساسة',  'medium',   true),
  ('update',          'crud',     'Update',                'تحديث',              'low',      false),
  ('delete',          'crud',     'Delete',                'حذف',                'high',     true),
  ('soft_delete',     'crud',     'Archive / soft-delete', 'أرشفة',              'medium',   true),
  ('restore',         'crud',     'Restore',               'استعادة',            'medium',   true),
  ('export',          'access',   'Export',                'تصدير',              'medium',   true),
  ('import',          'crud',     'Import',                'استيراد',            'medium',   true),
  ('grant_access',    'access',   'Grant access',          'منح الصلاحية',       'high',     true),
  ('revoke_access',   'access',   'Revoke access',         'إلغاء الصلاحية',     'high',     true),
  ('assign_role',     'access',   'Assign role',           'إسناد دور',          'high',     true),
  ('remove_role',     'access',   'Remove role',           'إزالة دور',          'high',     true),
  ('login',           'security', 'Login',                 'تسجيل دخول',         'info',     false),
  ('logout',          'security', 'Logout',                'تسجيل خروج',         'info',     false),
  ('login_failed',    'security', 'Failed login',          'فشل تسجيل الدخول',   'low',      false),
  ('mfa_challenge',   'security', 'MFA challenge',         'تحدي المصادقة',      'info',     false),
  ('password_reset',  'security', 'Password reset',        'إعادة تعيين كلمة المرور','medium', true),
  ('impersonate',     'security', 'Impersonate user',      'انتحال مستخدم',       'critical', true),
  ('impersonate_end', 'security', 'End impersonation',     'إنهاء الانتحال',     'medium',   true),
  ('approve',         'workflow', 'Approve',               'الموافقة',           'medium',   true),
  ('reject',          'workflow', 'Reject',                'رفض',                'medium',   true),
  ('escalate',        'workflow', 'Escalate',              'تصعيد',              'medium',   true),
  ('delegate',        'workflow', 'Delegate authority',    'تفويض الصلاحية',     'high',     true),
  ('revoke_delegation','workflow','Revoke delegation',     'إلغاء التفويض',      'high',     true),
  ('override',        'admin',    'Override control / policy','تجاوز ضابط/سياسة','critical', true),
  ('config_change',   'admin',    'Configuration change',  'تغيير إعدادات',      'high',     true),
  ('seed_apply',      'admin',    'Apply seed migration',  'تطبيق ترقية بيانات', 'high',     true),
  ('schema_change',   'admin',    'Schema change',         'تغيير المخطط',       'critical', true),
  ('data_export_bulk','access',   'Bulk data export',      'تصدير بيانات بالجملة','high',    true)
ON CONFLICT (action_code) DO UPDATE SET
  category = EXCLUDED.category, name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  default_severity = EXCLUDED.default_severity, evidence_required = EXCLUDED.evidence_required;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. COI DISCLOSURE CATEGORIES (12)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_coi_categories
  (category_code, name_en, name_ar, description_en, evidence_required)
VALUES
  ('family_employed_supplier', 'Family member employed by a supplier/vendor', 'فرد من العائلة موظف لدى مورد', 'Spouse, child, parent, sibling working at a current or prospective supplier.', true),
  ('equity_stake_vendor',      'Equity stake in a vendor/competitor',         'حصة ملكية في مورد أو منافس',  '≥1% holding (direct or indirect) in a counterparty.', true),
  ('board_seat_elsewhere',     'Board / advisory seat elsewhere',             'عضوية مجلس إدارة في جهة أخرى', 'Compensated or uncompensated board roles.', true),
  ('outside_employment',       'Outside employment / business',               'عمل خارجي',                  'Paid work outside the organisation.', true),
  ('gift_received',            'Gift received above policy threshold',        'هدية تتجاوز السقف المسموح',   'Gifts/hospitality > policy limit.', true),
  ('political_affiliation',    'Political role / affiliation',                'انتماء سياسي',               'Office holder or formal party role.', false),
  ('personal_relationship_dm', 'Personal relationship with decision maker',   'علاقة شخصية مع متخذ قرار',    'Romantic / family / close-friend with internal decision maker.', true),
  ('property_near_business',   'Property near business operations',           'ممتلكات قريبة من العمليات',   'Real estate that could be affected by business decisions.', false),
  ('public_office',            'Public sector role concurrent',               'شغل وظيفة عامة',             'Concurrent public-sector duty.', true),
  ('media_role',               'Journalism / media role',                     'دور إعلامي',                 'Public commentary or media employment.', false),
  ('charitable_role',          'Charitable / NGO board role',                 'دور في منظمة غير ربحية',     'Trustee / director at a charity or NGO.', false),
  ('intellectual_property',    'Personal IP / patents in adjacent domain',    'حقوق فكرية شخصية',           'Owned IP that could conflict with employer''s domain.', true)
ON CONFLICT (category_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, evidence_required = EXCLUDED.evidence_required, is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. READINESS DIMENSIONS (8)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_readiness_dimensions
  (dimension_code, name_en, name_ar, description_en, weight, query_ref, threshold_warn, threshold_crit, sort_order)
VALUES
  ('org_structure',  'Org structure',     'الهيكل التنظيمي',   'BUs, departments, positions filled per org template.', 1.5, 'foundation.readiness.orgScore',     80, 60, 10),
  ('rbac_coverage',  'RBAC coverage',     'تغطية الأدوار',     '% of users with role + permissions assigned.',         1.5, 'foundation.readiness.rbacScore',    90, 70, 20),
  ('policy_acks',    'Policy acks',       'الموافقة على السياسات','% of mandatory acks current.',                      1.0, 'foundation.readiness.policyAck',    90, 70, 30),
  ('training',       'Training compliance','تدريب الموظفين',   '% of mandatory courses completed before due.',         1.0, 'foundation.readiness.training',     90, 70, 40),
  ('sod',            'Segregation of duties','الفصل بين المهام','# of open SoD violations (target 0).',                2.0, 'foundation.readiness.sod',          0,  5, 50),
  ('doa',            'DoA matrix coverage','تغطية مصفوفة الصلاحيات','% of positions with documented authority limits.',1.5, 'foundation.readiness.doa',          90, 60, 60),
  ('access_reviews', 'Access reviews',    'مراجعات الصلاحيات', 'Most recent campaign closed within last 90d.',         1.0, 'foundation.readiness.accessReview', 90, 70, 70),
  ('coi',            'COI declarations',  'إقرارات تعارض المصالح','% of employees with current COI on file.',          1.0, 'foundation.readiness.coi',          90, 70, 80)
ON CONFLICT (dimension_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, weight = EXCLUDED.weight,
  query_ref = EXCLUDED.query_ref, threshold_warn = EXCLUDED.threshold_warn,
  threshold_crit = EXCLUDED.threshold_crit, sort_order = EXCLUDED.sort_order, is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. ORG TYPES (7)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_org_types
  (org_type_code, name_en, name_ar, description_en, levels, sample_structure, applicable_sectors)
VALUES
  ('hq_only',      'HQ-only / single-entity',  'كيان واحد',                   'Single legal entity, no subsidiaries.',                  2, '[{"level":1,"label":"Headquarters"},{"level":2,"label":"Departments"}]'::jsonb, ARRAY['retail','technology','professional_services','startup']),
  ('multi_branch', 'Multi-branch',             'متعدد الفروع',                'Single entity with multiple branches/regions.',           4, '[{"level":1,"label":"HQ"},{"level":2,"label":"Region"},{"level":3,"label":"Branch"},{"level":4,"label":"Department"}]'::jsonb, ARRAY['banking','retail','telco','hospitality']),
  ('subsidiary',   'Subsidiary structure',     'هيكل تابع',                   'Parent + one or more subsidiaries with shared services.',  4, '[{"level":1,"label":"Parent"},{"level":2,"label":"Subsidiary"},{"level":3,"label":"BU"},{"level":4,"label":"Department"}]'::jsonb, ARRAY['banking','insurance','energy','holdings']),
  ('holding',      'Holding company',          'شركة قابضة',                  'Holding with multiple operating companies.',                4, '[{"level":1,"label":"Holding"},{"level":2,"label":"Operating Co"},{"level":3,"label":"Division"},{"level":4,"label":"Department"}]'::jsonb, ARRAY['conglomerate','energy','holdings']),
  ('jv',           'Joint venture',            'شركة مشتركة',                 'Co-owned entity with parent governance.',                  3, '[{"level":1,"label":"JV Board"},{"level":2,"label":"BU"},{"level":3,"label":"Function"}]'::jsonb, ARRAY['energy','infrastructure']),
  ('government',   'Government / Ministry',    'حكومي / وزارة',              'Public-sector multi-tier structure.',                       5, '[{"level":1,"label":"Ministry"},{"level":2,"label":"Agency"},{"level":3,"label":"Directorate"},{"level":4,"label":"Department"},{"level":5,"label":"Section"}]'::jsonb, ARRAY['government','public_sector']),
  ('ngo',          'Non-profit / NGO',         'منظمة غير ربحية',             'Charity / foundation governance.',                          3, '[{"level":1,"label":"Board of Trustees"},{"level":2,"label":"Executive"},{"level":3,"label":"Programs"}]'::jsonb, ARRAY['nonprofit','charity'])
ON CONFLICT (org_type_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, levels = EXCLUDED.levels,
  sample_structure = EXCLUDED.sample_structure, applicable_sectors = EXCLUDED.applicable_sectors,
  is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- 9. LOCATION TYPES (12)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_location_types
  (type_code, name_en, name_ar, description_en, applicable_sectors)
VALUES
  ('hq',          'Headquarters',     'المقر الرئيسي',   'Principal office of the organisation.',         ARRAY['all']),
  ('branch',      'Branch office',    'فرع',             'Customer-facing branch location.',              ARRAY['banking','retail','telco','hospitality']),
  ('data_center', 'Data center',      'مركز بيانات',     'Server / cloud DC location for residency.',     ARRAY['all']),
  ('warehouse',   'Warehouse',        'مستودع',          'Storage / distribution facility.',              ARRAY['retail','manufacturing','energy']),
  ('factory',     'Factory / Plant',  'مصنع',            'Manufacturing facility.',                       ARRAY['manufacturing','energy']),
  ('retail',      'Retail store',     'متجر',            'Retail point of sale.',                         ARRAY['retail']),
  ('hospital',    'Hospital',         'مستشفى',          'Inpatient medical facility.',                   ARRAY['healthcare']),
  ('clinic',      'Clinic',           'عيادة',           'Outpatient clinic.',                            ARRAY['healthcare']),
  ('school',      'School / Campus',  'مدرسة / حرم',     'Educational facility.',                         ARRAY['education']),
  ('drilling_site','Drilling / wellsite','موقع حفر',     'Oil/gas drilling location.',                    ARRAY['energy']),
  ('remote_office','Remote office',   'مكتب عن بعد',     'Distributed / WFH-anchored office.',            ARRAY['all']),
  ('virtual',     'Virtual',          'افتراضي',         'Pure-virtual location for remote-only teams.',  ARRAY['all'])
ON CONFLICT (type_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, applicable_sectors = EXCLUDED.applicable_sectors,
  is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- 10. CALENDAR SYSTEMS (3)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_calendar_systems
  (calendar_code, name_en, name_ar, is_default_in_regions)
VALUES
  ('hijri',     'Hijri (Islamic)',    'هجري',  ARRAY['sa-riyadh','sa-jeddah']),
  ('gregorian', 'Gregorian',          'ميلادي', ARRAY['ae-dubai','kw-kuwait','qa-doha','eg-cairo','jo-amman','bh-manama']),
  ('both',      'Hijri + Gregorian',  'هجري + ميلادي', ARRAY['sa-riyadh','sa-jeddah','om-muscat'])
ON CONFLICT (calendar_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  is_default_in_regions = EXCLUDED.is_default_in_regions;

COMMIT;
