-- Foundation Sector Packs SEED (Wave 2.2) — banking + government + healthcare.
-- Each sector gets BUs, departments, key positions, sector-specific roles,
-- and required committees. Idempotent.

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- BANKING SECTOR PACK
-- ════════════════════════════════════════════════════════════════════════════

-- BUs (8)
INSERT INTO dos.foundation_cat_bu_templates
  (template_code, sector_code, name_en, name_ar, description_en, bu_type, sort_order) VALUES
  ('bnk_retail',       'banking', 'Retail Banking',         'الخدمات المصرفية للأفراد',  'Consumer accounts, cards, mortgages, personal loans.', 'line_of_business', 10),
  ('bnk_corporate',    'banking', 'Corporate Banking',      'الخدمات المصرفية للشركات', 'Lending, trade finance, cash mgmt for corporates.',     'line_of_business', 20),
  ('bnk_treasury',     'banking', 'Treasury & Capital Markets','الخزينة وأسواق المال', 'FX, fixed-income, money-market, derivatives.',          'line_of_business', 30),
  ('bnk_wealth',       'banking', 'Private Banking & Wealth','الخدمات المصرفية الخاصة', 'HNW client management, wealth advisory, investments.',  'line_of_business', 40),
  ('bnk_islamic',      'banking', 'Islamic Banking',         'المصرفية الإسلامية',     'Sharia-compliant products and Sharia board oversight.',  'line_of_business', 50),
  ('bnk_risk_control', 'banking', 'Risk & Control',          'المخاطر والضوابط',       'Credit / Market / Operational risk, AML, Compliance.',   'control', 60),
  ('bnk_ops',          'banking', 'Operations & Tech',       'العمليات والتقنية',      'Branch ops, IT, cybersecurity, data center, BCM.',       'support', 70),
  ('bnk_corp_func',    'banking', 'Corporate Functions',     'الوظائف المؤسسية',       'HR, Finance, Legal, Audit, Comms, Strategy.',            'support', 80)
ON CONFLICT (template_code, sector_code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, bu_type = EXCLUDED.bu_type, is_active = true;

-- Departments (15 banking)
INSERT INTO dos.foundation_cat_dept_templates
  (template_code, sector_code, name_en, name_ar, dept_function, bu_template, is_mandatory, sort_order) VALUES
  ('bnk_retail_branches','banking','Branch Network','شبكة الفروع','operations','bnk_retail',true,10),
  ('bnk_retail_cards',  'banking','Cards & Payments','البطاقات والمدفوعات','operations','bnk_retail',true,11),
  ('bnk_corp_lending',  'banking','Corporate Lending','الإقراض المؤسسي','operations','bnk_corporate',true,20),
  ('bnk_credit_risk',   'banking','Credit Risk','مخاطر الائتمان','risk','bnk_risk_control',true,30),
  ('bnk_market_risk',   'banking','Market Risk','مخاطر السوق','risk','bnk_risk_control',true,31),
  ('bnk_op_risk',       'banking','Operational Risk','المخاطر التشغيلية','risk','bnk_risk_control',true,32),
  ('bnk_aml',           'banking','AML & Financial Crime','مكافحة غسل الأموال','compliance','bnk_risk_control',true,33),
  ('bnk_compliance',    'banking','Regulatory Compliance','الامتثال التنظيمي','compliance','bnk_risk_control',true,34),
  ('bnk_audit',         'banking','Internal Audit','التدقيق الداخلي','audit','bnk_corp_func',true,40),
  ('bnk_finance',       'banking','Finance & Accounting','المالية والمحاسبة','finance','bnk_corp_func',true,50),
  ('bnk_hr',            'banking','Human Resources','الموارد البشرية','hr','bnk_corp_func',true,51),
  ('bnk_legal',         'banking','Legal','الشؤون القانونية','legal','bnk_corp_func',true,52),
  ('bnk_it',            'banking','Information Technology','تقنية المعلومات','it','bnk_ops',true,60),
  ('bnk_infosec',       'banking','Information Security','أمن المعلومات','infosec','bnk_ops',true,61),
  ('bnk_dpo',           'banking','Data Protection Office','مكتب حماية البيانات','dpo','bnk_corp_func',true,70)
ON CONFLICT (template_code, sector_code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, dept_function = EXCLUDED.dept_function, is_active = true;

-- Banking key positions (executive + senior management)
INSERT INTO dos.foundation_cat_position_templates
  (template_code, sector_code, title_en, title_ar, grade_code, grade_order, dept_function, is_executive, sort_order) VALUES
  ('bnk_ceo',  'banking','Chief Executive Officer','الرئيس التنفيذي','C-suite',14,'executive',true,1),
  ('bnk_cfo',  'banking','Chief Financial Officer','المدير المالي','C-suite',13,'finance',true,2),
  ('bnk_cro',  'banking','Chief Risk Officer','مدير المخاطر التنفيذي','C-suite',13,'risk',true,3),
  ('bnk_cco',  'banking','Chief Compliance Officer','مدير الامتثال التنفيذي','C-suite',13,'compliance',true,4),
  ('bnk_ciso', 'banking','Chief Information Security Officer','مدير أمن المعلومات','C-suite',13,'infosec',true,5),
  ('bnk_cio',  'banking','Chief Information Officer','مدير تقنية المعلومات','C-suite',13,'it',true,6),
  ('bnk_dpo',  'banking','Data Protection Officer','مسؤول حماية البيانات','D2',11,'dpo',true,7),
  ('bnk_chief_auditor','banking','Chief Internal Auditor','المدقق الداخلي الرئيسي','D2',11,'audit',true,8),
  ('bnk_head_aml','banking','Head of AML','رئيس مكافحة غسل الأموال','D1',10,'compliance',false,9),
  ('bnk_head_credit','banking','Head of Credit Risk','رئيس مخاطر الائتمان','D1',10,'risk',false,10),
  ('bnk_head_treasury','banking','Head of Treasury','رئيس الخزينة','D1',10,'operations',false,11),
  ('bnk_branch_mgr','banking','Branch Manager','مدير الفرع','M3',7,'operations',false,30)
ON CONFLICT (template_code, sector_code) DO UPDATE SET title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar, grade_code = EXCLUDED.grade_code, is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- GOVERNMENT SECTOR PACK
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO dos.foundation_cat_bu_templates
  (template_code, sector_code, name_en, name_ar, description_en, bu_type, sort_order) VALUES
  ('gov_policy',       'government', 'Policy & Planning',     'السياسات والتخطيط',     'Strategy, regulation drafting, public consultation.',  'line_of_business', 10),
  ('gov_operations',   'government', 'Operations',            'العمليات',              'Service delivery, citizen-facing operations.',         'line_of_business', 20),
  ('gov_inspectorate', 'government', 'Inspectorate / Compliance','التفتيش والامتثال', 'Field inspection, enforcement, audits.',                'control', 30),
  ('gov_communications','government','Public Affairs / Comms','العلاقات العامة',       'Public communication, press, citizen engagement.',     'support', 40),
  ('gov_corp_services','government', 'Corporate Services',    'الخدمات المؤسسية',      'HR, IT, Legal, Finance, Procurement, BCM.',            'support', 50)
ON CONFLICT (template_code, sector_code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, bu_type = EXCLUDED.bu_type, is_active = true;

INSERT INTO dos.foundation_cat_dept_templates
  (template_code, sector_code, name_en, name_ar, dept_function, bu_template, is_mandatory, sort_order) VALUES
  ('gov_policy_unit',  'government','Policy Unit','وحدة السياسات','operations','gov_policy',true,10),
  ('gov_legal_drafting','government','Legal Drafting','الصياغة القانونية','legal','gov_policy',true,11),
  ('gov_program_delivery','government','Program Delivery','تنفيذ البرامج','operations','gov_operations',true,20),
  ('gov_field_inspection','government','Field Inspection','التفتيش الميداني','operations','gov_inspectorate',true,30),
  ('gov_internal_audit','government','Internal Audit','التدقيق الداخلي','audit','gov_corp_services',true,40),
  ('gov_finance',      'government','Finance & Treasury','المالية والخزينة','finance','gov_corp_services',true,50),
  ('gov_hr',           'government','Human Resources','الموارد البشرية','hr','gov_corp_services',true,51),
  ('gov_it',           'government','Information Technology','تقنية المعلومات','it','gov_corp_services',true,52),
  ('gov_infosec',      'government','Information Security','أمن المعلومات','infosec','gov_corp_services',true,53),
  ('gov_dpo',          'government','Data Protection Office','مكتب حماية البيانات','dpo','gov_corp_services',true,54),
  ('gov_procurement',  'government','Procurement','المشتريات','procurement','gov_corp_services',true,55),
  ('gov_records_mgmt', 'government','Records Management','إدارة السجلات','records','gov_corp_services',true,56),
  ('gov_legal',        'government','Legal Counsel','الشؤون القانونية','legal','gov_corp_services',true,57)
ON CONFLICT (template_code, sector_code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, dept_function = EXCLUDED.dept_function, is_active = true;

INSERT INTO dos.foundation_cat_position_templates
  (template_code, sector_code, title_en, title_ar, grade_code, grade_order, dept_function, is_executive, sort_order) VALUES
  ('gov_minister', 'government','Minister','الوزير','C-suite',15,'executive',true,1),
  ('gov_dep_minister','government','Deputy Minister','نائب الوزير','C-suite',14,'executive',true,2),
  ('gov_ceo_agency','government','Agency CEO / Director General','الرئيس التنفيذي للهيئة','C-suite',13,'executive',true,3),
  ('gov_chief_auditor','government','Chief Auditor','المدقق الرئيسي','D2',11,'audit',true,4),
  ('gov_dpo',      'government','Data Protection Officer','مسؤول حماية البيانات','D1',10,'dpo',true,5),
  ('gov_ciso',     'government','Chief Information Security Officer','مدير أمن المعلومات','D1',10,'infosec',true,6),
  ('gov_proc_mgr', 'government','Procurement Director','مدير المشتريات','D1',10,'procurement',false,7),
  ('gov_inspector','government','Senior Inspector','مفتش أول','M3',7,'operations',false,30)
ON CONFLICT (template_code, sector_code) DO UPDATE SET title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar, grade_code = EXCLUDED.grade_code, is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- HEALTHCARE SECTOR PACK
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO dos.foundation_cat_bu_templates
  (template_code, sector_code, name_en, name_ar, description_en, bu_type, sort_order) VALUES
  ('hc_clinical',     'healthcare','Clinical Operations',   'العمليات السريرية',      'Inpatient, outpatient, ER, OR, ICU.',                  'line_of_business', 10),
  ('hc_pharmacy',     'healthcare','Pharmacy',              'الصيدلية',              'In-house pharmacy, dispensing, drug control.',          'line_of_business', 20),
  ('hc_diagnostics',  'healthcare','Diagnostics & Imaging', 'التشخيص والأشعة',       'Lab, radiology, pathology.',                            'line_of_business', 30),
  ('hc_quality_safety','healthcare','Quality & Patient Safety','الجودة وسلامة المرضى','Clinical governance, infection control, JCI.',         'control', 40),
  ('hc_hr_credentialing','healthcare','HR & Credentialing','الموارد البشرية والاعتماد','Staff onboarding, license verification, scope.',       'support', 50),
  ('hc_corp_services','healthcare','Corporate Services',     'الخدمات المؤسسية',     'Finance, IT, Legal, Procurement, BCM.',                'support', 60)
ON CONFLICT (template_code, sector_code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, bu_type = EXCLUDED.bu_type, is_active = true;

INSERT INTO dos.foundation_cat_dept_templates
  (template_code, sector_code, name_en, name_ar, dept_function, bu_template, is_mandatory, sort_order) VALUES
  ('hc_emergency',     'healthcare','Emergency Department','الطوارئ','clinical','hc_clinical',true,10),
  ('hc_surgery',       'healthcare','Surgery','الجراحة','clinical','hc_clinical',true,11),
  ('hc_internal_med',  'healthcare','Internal Medicine','الباطنية','clinical','hc_clinical',true,12),
  ('hc_pediatrics',    'healthcare','Pediatrics','طب الأطفال','clinical','hc_clinical',true,13),
  ('hc_obgyn',         'healthcare','OB/GYN','النساء والولادة','clinical','hc_clinical',true,14),
  ('hc_pharmacy_dept', 'healthcare','Pharmacy','الصيدلية','clinical','hc_pharmacy',true,20),
  ('hc_lab',           'healthcare','Lab','المختبر','clinical','hc_diagnostics',true,30),
  ('hc_radiology',     'healthcare','Radiology','الأشعة','clinical','hc_diagnostics',true,31),
  ('hc_quality',       'healthcare','Quality Mgmt','إدارة الجودة','quality','hc_quality_safety',true,40),
  ('hc_infection',     'healthcare','Infection Control','مكافحة العدوى','quality','hc_quality_safety',true,41),
  ('hc_credentialing', 'healthcare','Credentialing','الاعتماد المهني','hr','hc_hr_credentialing',true,50),
  ('hc_finance',       'healthcare','Finance','المالية','finance','hc_corp_services',true,60),
  ('hc_it',            'healthcare','Information Technology','تقنية المعلومات','it','hc_corp_services',true,61),
  ('hc_dpo',           'healthcare','Data Protection Office','مكتب حماية البيانات','dpo','hc_corp_services',true,62),
  ('hc_legal',         'healthcare','Legal & Risk','القانون والمخاطر','legal','hc_corp_services',true,63)
ON CONFLICT (template_code, sector_code) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, dept_function = EXCLUDED.dept_function, is_active = true;

INSERT INTO dos.foundation_cat_position_templates
  (template_code, sector_code, title_en, title_ar, grade_code, grade_order, dept_function, is_executive, sort_order) VALUES
  ('hc_ceo',         'healthcare','Hospital CEO','الرئيس التنفيذي للمستشفى','C-suite',14,'executive',true,1),
  ('hc_cmo',         'healthcare','Chief Medical Officer','رئيس الشؤون الطبية','C-suite',13,'clinical',true,2),
  ('hc_cno',         'healthcare','Chief Nursing Officer','رئيس التمريض','C-suite',13,'clinical',true,3),
  ('hc_cqo',         'healthcare','Chief Quality Officer','رئيس الجودة','C-suite',13,'quality',true,4),
  ('hc_cfo',         'healthcare','Chief Financial Officer','المدير المالي','C-suite',13,'finance',true,5),
  ('hc_dpo',         'healthcare','Data Protection Officer','مسؤول حماية البيانات','D2',11,'dpo',true,6),
  ('hc_chief_pharmacist','healthcare','Chief Pharmacist','رئيس الصيدلة','D1',10,'clinical',false,7),
  ('hc_dept_chief_med','healthcare','Department Chief (Medical)','رئيس قسم طبي','M5',9,'clinical',false,10),
  ('hc_consultant',  'healthcare','Consultant Physician','استشاري','M3',7,'clinical',false,20),
  ('hc_specialist',  'healthcare','Specialist Physician','أخصائي','M2',6,'clinical',false,21),
  ('hc_resident',    'healthcare','Resident Physician','مقيم','IC3',3,'clinical',false,22),
  ('hc_head_nurse',  'healthcare','Head Nurse','رئيس التمريض','M2',6,'clinical',false,30)
ON CONFLICT (template_code, sector_code) DO UPDATE SET title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar, grade_code = EXCLUDED.grade_code, is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- COMMITTEE TEMPLATES — Universal (NULL sector) + sector-specific
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_committee_templates
  (template_code, sector_code, name_en, name_ar, charter_en, member_roles, quorum_pct, meeting_cadence, term_months, is_mandatory, required_by_frameworks)
VALUES
  -- Universal
  ('board',            NULL, 'Board of Directors',
   'مجلس الإدارة',
   'Highest governing body. Approves strategy, budget, major risks, executive appointments.',
   ARRAY['ceo','board_chair','independent_director'], 50.0, 'monthly', 36, true,
   ARRAY['SAMA-CSF','NCA-ECC','ISO27001']),
  ('audit_committee',  NULL, 'Audit Committee',
   'لجنة التدقيق',
   'Oversees internal + external audit, financial reporting, regulatory compliance.',
   ARRAY['independent_director','chief_auditor','cfo'], 50.0, 'quarterly', 36, true,
   ARRAY['SAMA-CSF','SOX','ISO27001']),
  ('risk_committee',   NULL, 'Risk Committee',
   'لجنة المخاطر',
   'Oversees enterprise risk, risk appetite, key risk indicators.',
   ARRAY['cro','cfo','independent_director'], 50.0, 'quarterly', 36, true,
   ARRAY['SAMA-CSF','BASEL3']),
  ('compliance_committee', NULL, 'Compliance Committee',
   'لجنة الامتثال',
   'Oversees regulatory compliance program, policy approvals.',
   ARRAY['cco','dpo','chief_auditor'], 50.0, 'quarterly', 36, true,
   ARRAY['SAMA-CSF','PDPL','SOX']),
  ('it_steering',      NULL, 'IT Steering Committee',
   'لجنة توجيه تقنية المعلومات',
   'Approves IT investments, prioritises portfolio, oversees major programs.',
   ARRAY['cio','cfo','ciso','line_manager'], 50.0, 'monthly', 12, false,
   ARRAY['COBIT','SAMA-IT']),
  ('disclosure_committee', NULL, 'Disclosure Committee',
   'لجنة الإفصاح',
   'Approves public disclosures, regulatory filings, market communications.',
   ARRAY['cfo','legal_counsel','cco','ceo'], 75.0, 'ad-hoc', NULL, true,
   ARRAY['SAMA-CSF','SOX']),
  ('ethics_committee', NULL, 'Ethics Committee',
   'لجنة الأخلاق',
   'Reviews COI, ethics violations, whistleblower cases.',
   ARRAY['cco','hr_manager','independent_director','legal_counsel'], 50.0, 'quarterly', 24, true,
   ARRAY['ISO37001']),
  ('data_governance',  NULL, 'Data Governance Committee',
   'لجنة حوكمة البيانات',
   'PDPL/data classification/data quality oversight.',
   ARRAY['dpo','cio','cco','line_manager'], 50.0, 'quarterly', 24, true,
   ARRAY['PDPL','GDPR','NDMO','ISO27701']),
  ('bcm_committee',    NULL, 'BCM / Crisis Committee',
   'لجنة استمرارية الأعمال',
   'Approves BCM plans, drives crisis-response readiness.',
   ARRAY['ceo','ciso','cio','cfo'], 50.0, 'quarterly', 12, true,
   ARRAY['ISO22301','SAMA-BCM']),
  ('investment_committee','banking','Investment Committee',
   'لجنة الاستثمار',
   'Approves treasury and capital-market positions above thresholds.',
   ARRAY['ceo','cfo','head_treasury','cro'], 75.0, 'monthly', 12, true,
   ARRAY['SAMA-CSF']),
  ('credit_committee', 'banking','Credit Committee',
   'لجنة الائتمان',
   'Approves credit exposures above branch authority limits.',
   ARRAY['head_credit_risk','cro','head_corporate'], 75.0, 'weekly', 12, true,
   ARRAY['SAMA-CSF','BASEL3']),
  ('clinical_governance','healthcare','Clinical Governance Committee',
   'لجنة الحوكمة السريرية',
   'Oversees clinical quality, peer-review, sentinel events.',
   ARRAY['cmo','cno','cqo','consultant_physician'], 50.0, 'monthly', 12, true,
   ARRAY['MoH-CBAHI','JCI']),
  ('procurement_committee','government','Procurement Committee',
   'لجنة المشتريات',
   'Approves government tenders above threshold.',
   ARRAY['ceo_agency','proc_director','cfo','legal_counsel','independent'], 75.0, 'weekly', 12, true,
   ARRAY['Saudi Tender Law'])
ON CONFLICT (template_code, sector_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  charter_en = EXCLUDED.charter_en, member_roles = EXCLUDED.member_roles,
  quorum_pct = EXCLUDED.quorum_pct, meeting_cadence = EXCLUDED.meeting_cadence,
  term_months = EXCLUDED.term_months, is_mandatory = EXCLUDED.is_mandatory,
  required_by_frameworks = EXCLUDED.required_by_frameworks, is_active = true;

-- ════════════════════════════════════════════════════════════════════════════
-- ROLE TEMPLATES — Universal + sector-specific
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO dos.foundation_cat_role_templates
  (role_code, sector_code, name_en, name_ar, description_en, applies_to_profiles, is_platform_default)
VALUES
  -- Universal platform-default roles (15)
  ('tenant_owner',       NULL, 'Tenant Owner',          'مالك المستأجر',         'Top admin role with all permissions.',    ARRAY['employee_full_time'], true),
  ('foundation_admin',   NULL, 'Foundation Administrator','مدير المؤسسة',       'Manages org structure, users, roles.',     ARRAY['employee_full_time'], true),
  ('hr_manager',         NULL, 'HR Manager',            'مدير الموارد البشرية',  'Manages employee lifecycle.',              ARRAY['employee_full_time'], true),
  ('line_manager',       NULL, 'Line Manager',          'المدير المباشر',        'Manages direct reports.',                   ARRAY['employee_full_time'], true),
  ('compliance_officer', NULL, 'Compliance Officer',    'مسؤول الامتثال',        'Owns regulatory compliance program.',      ARRAY['employee_full_time'], true),
  ('auditor',            NULL, 'Internal Auditor',      'مدقق داخلي',            'Internal audit reads + tests.',            ARRAY['employee_full_time'], true),
  ('auditor_external',   NULL, 'External Auditor',      'مدقق خارجي',            'External auditor with read-only access.', ARRAY['external_auditor','regulator_rep'], true),
  ('risk_owner',         NULL, 'Risk Owner',            'مالك المخاطرة',         'Accountable for an assigned risk.',        ARRAY['employee_full_time'], true),
  ('control_tester',     NULL, 'Control Tester',        'مختبر الضوابط',         'Tests controls and uploads evidence.',     ARRAY['employee_full_time','contractor_tm'], true),
  ('policy_author',      NULL, 'Policy Author',         'كاتب السياسة',          'Drafts and revises policies.',             ARRAY['employee_full_time'], true),
  ('dpo',                NULL, 'Data Protection Officer','مسؤول حماية البيانات','PDPL accountable role.',                  ARRAY['employee_full_time'], true),
  ('ciso',               NULL, 'Chief Information Security Officer','مدير أمن المعلومات','Owns infosec program.',         ARRAY['employee_full_time'], true),
  ('board_member',       NULL, 'Board Member',          'عضو مجلس إدارة',        'Reviews board materials, votes.',          ARRAY['board_member'], true),
  ('vendor_user',        NULL, 'Vendor User',           'مستخدم المورد',         'External vendor with scoped access.',      ARRAY['vendor_rep'], true),
  ('employee',           NULL, 'Employee (default)',    'موظف (افتراضي)',        'Default employee role.',                    ARRAY['employee_full_time','employee_part_time'], true),
  -- Banking-specific
  ('aml_analyst',        'banking','AML Analyst',       'محلل مكافحة غسل الأموال','Investigates AML alerts.',                 ARRAY['employee_full_time'], false),
  ('credit_officer',     'banking','Credit Officer',    'مسؤول ائتمان',          'Approves credit applications.',            ARRAY['employee_full_time'], false),
  ('treasury_dealer',    'banking','Treasury Dealer',   'تاجر الخزينة',          'Executes FX/MM/FI trades.',                ARRAY['employee_full_time'], false),
  ('treasury_settler',   'banking','Treasury Settler',  'مسوي الصفقات',          'Settles trades — must be ≠ dealer (SoD).', ARRAY['employee_full_time'], false),
  ('branch_manager',     'banking','Branch Manager',    'مدير الفرع',            'Manages branch operations.',                ARRAY['employee_full_time'], false),
  -- Government-specific
  ('inspector',          'government','Inspector',      'مفتش',                  'Field inspector with enforcement authority.',ARRAY['employee_full_time'], false),
  ('procurement_officer','government','Procurement Officer','مسؤول مشتريات',     'Manages tenders + RFx.',                    ARRAY['employee_full_time'], false),
  ('records_officer',    'government','Records Officer','مسؤول السجلات',         'Records mgmt + retention.',                 ARRAY['employee_full_time'], false),
  -- Healthcare-specific
  ('attending_physician','healthcare','Attending Physician','الطبيب المسؤول',    'Primary attending with order-writing authority.',ARRAY['employee_full_time'], false),
  ('pharmacist',         'healthcare','Pharmacist',     'صيدلي',                 'Dispensing authority (controlled drugs SoD).',ARRAY['employee_full_time'], false),
  ('infection_preventionist','healthcare','Infection Preventionist','مختص مكافحة العدوى','Owns IPC program.',          ARRAY['employee_full_time'], false)
ON CONFLICT (role_code, sector_code) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en, applies_to_profiles = EXCLUDED.applies_to_profiles,
  is_platform_default = EXCLUDED.is_platform_default, is_active = true;

COMMIT;
