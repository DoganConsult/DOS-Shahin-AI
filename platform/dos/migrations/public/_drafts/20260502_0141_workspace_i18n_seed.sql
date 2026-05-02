-- dos:draft
-- =====================================================================
-- F.1c — Workspace i18n + nav label seed (20260502_0141)
--
-- Materialises the canonical platform default for every i18n key the
-- workspace cornerstone consumes today. Source-of-truth mirror of the
-- `I18N` map inside
--   products/shahin-ai/app/src/app/shell/workspace-resolver.service.ts
-- which the FE will continue to use as a stub until the platform-side
-- dynamic-ui-service exposes /api/i18n/lookup.
--
-- Coverage:
--   - workspace.* (hero, sections, KPIs, setup, AI tips, empty states)
--   - status.tenant.* (active / platform_dna / trial_expired / suspended)
--   - role.* (owner / tenant_owner / tenant_admin / member)
--   - shell.* (header, account menu, search/language/notifications/help/theme)
--   - nav.group.* (sidebar group labels — Primary / Secondary / Foundation / …)
--   - nav.item.*  (sidebar item labels — Foundation / Risk / Compliance / …)
--   - tenant_settings.* (page hero + section catalog)
--   - common.action.* (shared verbs: Open / Retry / Dismiss / View all)
--
-- Two locales seeded: en (default) and ar. Tenant + user overrides
-- arrive later via the same table with source='tenant' / 'user'.
--
-- Depends on: 20260502_0135_i18n_catalog.sql (must be promoted first).
-- =====================================================================
BEGIN;

-- Ensure the workspace + tenant-settings + status + role + common
-- + shell + nav namespaces exist (idempotent, may already be inserted
-- by 0135's seed block).
INSERT INTO dos.i18n_namespaces (ns_key, description, owner_module) VALUES
  ('shell',           'Workspace shell chrome (header, account menu, nav aria)', 'foundation'),
  ('nav',             'Sidebar navigation labels (groups + items)',              'foundation')
ON CONFLICT (ns_key) DO NOTHING;

-- ── Helper: a CTE that lists every (ns, key, en, ar) row, then one
--    INSERT each into i18n_keys + i18n_translations. PostgreSQL doesn't
--    support multi-target INSERTs from a CTE, so we do two passes.
WITH rows(ns_key, key, en, ar) AS (
  VALUES
    -- ── workspace.* ─────────────────────────────────────────────────
    ('workspace', 'eyebrow',                 'workspace',           'مساحة العمل'),
    ('workspace', 'title',                   'Command center',      'مركز القيادة'),
    ('workspace', 'welcome',                 'Welcome',             'مرحبًا'),
    ('workspace', 'kpi.tenant',              'Tenant',              'المستأجر'),
    ('workspace', 'kpi.status',              'Status',              'الحالة'),
    ('workspace', 'kpi.role',                'Your role',           'دورك'),
    ('workspace', 'kpi.modules',             'Modules entitled',    'الوحدات المخصصة'),
    ('workspace', 'section.setup',           'Setup progress',                                                                    'تقدم الإعداد'),
    ('workspace', 'section.setup.sub',       'Activate your workspace step by step.',                                             'فعّل مساحة عملك خطوة بخطوة.'),
    ('workspace', 'section.tasks',           'My tasks',                                                                          'مهامي'),
    ('workspace', 'section.approvals',       'My approvals',                                                                      'الموافقات الخاصة بي'),
    ('workspace', 'section.activity',        'Recent activity',                                                                   'النشاط الأخير'),
    ('workspace', 'section.modules',         'Module launcher',                                                                   'مشغل الوحدات'),
    ('workspace', 'section.modules.sub',     'Open any entitled module.',                                                         'افتح أي وحدة مفعّلة.'),
    ('workspace', 'section.actions',         'Quick actions',                                                                     'إجراءات سريعة'),
    ('workspace', 'section.ai',              'AI recommendations',                                                                'توصيات الذكاء الاصطناعي'),
    ('workspace', 'section.ai.sub',          'What we suggest you do next.',                                                      'ما نقترح فعله الآن.'),
    ('workspace', 'section.copilot',         'AI Copilot',                                                                        'مساعد الذكاء الاصطناعي'),
    ('workspace', 'section.copilot.sub',     'Ask, search, create, navigate. Hit ⌘K anywhere.',                                   'اسأل، ابحث، أنشئ، تنقّل. اضغط ⌘K في أي مكان.'),
    ('workspace', 'section.health',          'System readiness',                                                                  'جاهزية النظام'),
    ('workspace', 'health.adminonly',        'Admin-only readiness probe.',                                                       'فحص جاهزية للمسؤول فقط.'),
    ('workspace', 'health.online',           'online',                                                                            'متصل'),
    ('workspace', 'health.offline',          'pending',                                                                           'قيد الانتظار'),
    ('workspace', 'health.dna',              'DNA modules',                                                                       'وحدات الحمض النووي'),
    ('workspace', 'health.entitled',         'Entitled modules',                                                                  'الوحدات المخصصة'),
    ('workspace', 'health.openfga',          'Authorization seed',                                                                'بذور التفويض'),
    ('workspace', 'health.trial',            'Trial status',                                                                      'حالة التجربة'),
    ('workspace', 'search.placeholder',      'Filter modules…',                                                                   'تصفية الوحدات…'),
    ('workspace', 'col.module',              'Module',                                                                            'الوحدة'),
    ('workspace', 'col.code',                'Code',                                                                              'الرمز'),
    ('workspace', 'col.description',         'Description',                                                                       'الوصف'),
    ('workspace', 'col.status',              'Status',                                                                            'الحالة'),
    ('workspace', 'empty.modules.title',     'No modules entitled yet',                                                           'لا توجد وحدات مخصصة بعد'),
    ('workspace', 'empty.modules.description','Modules become visible here as their backends come online and entitlement is granted.', 'تظهر الوحدات هنا عند تفعيل خدماتها.'),
    ('workspace', 'empty.tasks.title',       'No tasks assigned to you yet.',                                                     'لا توجد مهام مسندة إليك بعد.'),
    ('workspace', 'empty.approvals.title',   'No approvals waiting on you.',                                                      'لا توجد موافقات بانتظارك.'),
    ('workspace', 'empty.activity.title',    'No activity recorded yet.',                                                         'لم يُسجّل أي نشاط بعد.'),
    ('workspace', 'loading',                 'Loading your workspace…',                                                           'جارٍ تحميل مساحة العمل…'),
    ('workspace', 'no_session',              'Could not load your workspace identity. Sign in again.',                            'تعذر تحميل هوية مساحة العمل. يرجى تسجيل الدخول مرة أخرى.'),
    ('workspace', 'action.open',             'Open',                                                                              'فتح'),
    ('workspace', 'action.view_all',         'View all',                                                                          'عرض الكل'),
    ('workspace', 'action.ask_ai',           'Ask AI',                                                                            'اسأل الذكاء'),
    ('workspace', 'action.account',          'Account',                                                                           'الحساب'),
    ('workspace', 'action.account.title',    'Profile',                                                                           'الملف الشخصي'),
    ('workspace', 'action.account.desc',     'Identity, role, permissions, sessions, MFA.',                                       'الهوية، الدور، الصلاحيات، الجلسات، المصادقة الثنائية.'),
    ('workspace', 'action.workspace',        'Workspace',                                                                         'مساحة العمل'),
    ('workspace', 'action.workspace.title',  'Tenant profile',                                                                    'ملف المستأجر'),
    ('workspace', 'action.workspace.desc',   'Tenant identity, modules and defaults.',                                            'هوية المستأجر، الوحدات والإعدادات الافتراضية.'),
    ('workspace', 'action.prefs',            'Preferences',                                                                       'التفضيلات'),
    ('workspace', 'action.prefs.title',      'Settings',                                                                          'الإعدادات'),
    ('workspace', 'action.prefs.desc',       'Language, timezone, notifications and session.',                                    'اللغة، المنطقة الزمنية، الإشعارات والجلسة.'),
    ('workspace', 'action.admin',            'Administration',                                                                    'الإدارة'),
    ('workspace', 'action.admin.title',      'Tenant settings',                                                                   'إعدادات المستأجر'),
    ('workspace', 'action.admin.desc',       'Workspace configuration, SSO, modules, billing.',                                   'تكوين مساحة العمل، الدخول الموحد، الوحدات، الفوترة.'),
    ('workspace', 'action.invite',           'Team',                                                                              'الفريق'),
    ('workspace', 'action.invite.title',     'Invite users',                                                                      'دعوة المستخدمين'),
    ('workspace', 'action.invite.desc',      'Add teammates and assign roles.',                                                   'أضف أعضاء الفريق وعيّن أدوارهم.'),
    ('workspace', 'action.copilot',          'Copilot',                                                                           'المساعد'),
    ('workspace', 'action.copilot.title',    'Ask AI',                                                                            'اسأل الذكاء'),
    ('workspace', 'action.copilot.desc',     'Open the workspace assistant.',                                                     'افتح مساعد مساحة العمل.'),
    ('workspace', 'setup.profile',           'Complete your profile',                                                             'أكمل ملفك الشخصي'),
    ('workspace', 'setup.tenant',            'Confirm tenant identity',                                                           'تأكيد هوية المستأجر'),
    ('workspace', 'setup.modules',           'Activate at least one module',                                                      'فعّل وحدة واحدة على الأقل'),
    ('workspace', 'setup.team',              'Invite your team',                                                                  'ادعُ فريقك'),
    ('workspace', 'progress.complete',       'complete',                                                                          'مكتمل'),
    ('workspace', 'ai.setup.title',          'Finish setup first',                                                                'أكمل الإعداد أولاً'),
    ('workspace', 'ai.setup.body',           'Complete the setup checklist to unlock activity, approvals, and AI insights.',     'أكمل قائمة الإعداد لفتح النشاط والموافقات ورؤى الذكاء الاصطناعي.'),
    ('workspace', 'ai.module.title',         'Open Foundation',                                                                   'افتح الأساس'),
    ('workspace', 'ai.module.body',          'Foundation is platform DNA. Confirm org, identity and lifecycle to enable everything else.', 'الأساس هو الحمض النووي للمنصة. أكّد الهوية والمؤسسة لتفعيل كل شيء.'),
    ('workspace', 'ai.invite.title',         'Invite teammates',                                                                  'ادعُ الزملاء'),
    ('workspace', 'ai.invite.body',          'Approvals, RACI and SoD only become useful with at least 2 active members.',       'الموافقات وRACI تصبح مفيدة مع عضوين نشطين على الأقل.'),

    -- ── status.tenant.* ─────────────────────────────────────────────
    ('status', 'tenant.active',              'Active',              'نشط'),
    ('status', 'tenant.platform_dna',        'Platform DNA',        'منصة أساسية'),
    ('status', 'tenant.trial_expired',       'Trial expired',       'انتهت الفترة التجريبية'),
    ('status', 'tenant.suspended',           'Suspended',           'موقوف'),

    -- ── role.* ──────────────────────────────────────────────────────
    ('role', 'owner',                        'Owner',               'مالك'),
    ('role', 'tenant_owner',                 'Tenant owner',        'مالك المستأجر'),
    ('role', 'tenant_admin',                 'Administrator',       'مسؤول'),
    ('role', 'member',                       'Member',              'عضو'),

    -- ── shell.* ─────────────────────────────────────────────────────
    ('shell', 'brand.fallback',              'Workspace',           'مساحة العمل'),
    ('shell', 'tenant.prefix',               'Tenant: ',            'المستأجر: '),
    ('shell', 'account.aria',                'Account',             'الحساب'),
    ('shell', 'account.fallback',            'Account',             'الحساب'),
    ('shell', 'signout',                     'Sign out',            'تسجيل الخروج'),
    ('shell', 'search.aria',                 'Search',              'بحث'),
    ('shell', 'language.aria',               'Language',            'اللغة'),
    ('shell', 'notifications.aria',          'Notifications',       'الإشعارات'),
    ('shell', 'help.aria',                   'Help',                'المساعدة'),
    ('shell', 'theme.aria',                  'Theme',               'السمة'),
    ('shell', 'nav.aria',                    'Workspace navigation','التنقل في مساحة العمل'),
    ('shell', 'account.menu.profile',         'Profile',            'الملف الشخصي'),
    ('shell', 'account.menu.settings',        'Settings',           'الإعدادات'),
    ('shell', 'account.menu.tenant_profile',  'Tenant profile',     'ملف المستأجر'),
    ('shell', 'account.menu.tenant_settings', 'Tenant settings',    'إعدادات المستأجر'),
    ('shell', 'account.menu.logout',          'Sign out',           'تسجيل الخروج'),

    -- ── nav.group.* ─────────────────────────────────────────────────
    ('nav', 'group.workspace',               'Workspace',           'مساحة العمل'),
    ('nav', 'group.core',                    'Core',                'الأساسيات'),
    ('nav', 'group.tenant',                  'Tenant',              'المستأجر'),
    ('nav', 'group.foundation',              'Foundation',          'الأساس'),
    ('nav', 'group.modules',                 'Modules',             'الوحدات'),
    ('nav', 'group.primary',                 'Primary',             'الرئيسية'),
    ('nav', 'group.secondary',               'Secondary',           'الثانوية'),
    ('nav', 'group.platform',                'Platform',            'المنصة'),
    ('nav', 'group.misc',                    'More',                'المزيد'),

    -- ── nav.item.* ──────────────────────────────────────────────────
    ('nav', 'item.foundation',               'Foundation',          'الأساس'),
    ('nav', 'item.risk',                     'Risk',                'المخاطر'),
    ('nav', 'item.risks',                    'Risk',                'المخاطر'),
    ('nav', 'item.compliance',               'Compliance',          'الامتثال'),
    ('nav', 'item.controls',                 'Controls',            'الضوابط'),
    ('nav', 'item.evidence',                 'Evidence',            'الأدلة'),
    ('nav', 'item.audit',                    'Audit',               'التدقيق'),
    ('nav', 'item.knowledge',                'Knowledge',           'المعرفة'),
    ('nav', 'item.reporting',                'Reporting',           'التقارير'),
    ('nav', 'item.analytics',                'Analytics',           'التحليلات'),
    ('nav', 'item.workflow',                 'Workflow',            'سير العمل'),
    ('nav', 'item.workflows',                'Workflow',            'سير العمل'),
    ('nav', 'item.policy',                   'Policy',              'السياسات'),
    ('nav', 'item.policies',                 'Policy',              'السياسات'),
    ('nav', 'item.privacy',                  'Privacy',             'الخصوصية'),
    ('nav', 'item.vendor',                   'Vendor',              'الموردين'),
    ('nav', 'item.vendors',                  'Vendor',              'الموردين'),
    ('nav', 'item.asset',                    'Asset',               'الأصول'),
    ('nav', 'item.assets',                   'Asset',               'الأصول'),
    ('nav', 'item.bcp',                      'BCP',                 'استمرارية الأعمال'),
    ('nav', 'item.training',                 'Training',            'التدريب'),
    ('nav', 'item.remediation',              'Remediation',         'المعالجة'),
    ('nav', 'item.action',                   'Actions',             'الإجراءات'),
    ('nav', 'item.actions',                  'Actions',             'الإجراءات'),
    ('nav', 'item.dora',                     'DORA',                'DORA'),
    ('nav', 'item.journey',                  'Qiyas Journey',       'رحلة قياس'),
    ('nav', 'item.qiyas',                    'Qiyas',               'قياس'),
    ('nav', 'item.executive',                'Executive',           'القيادة التنفيذية'),
    ('nav', 'item.executive-intelligence',   'Executive Intelligence','استخبارات تنفيذية'),
    ('nav', 'item.ai-governance',            'AI Governance',       'حوكمة الذكاء الاصطناعي'),
    ('nav', 'item.ai-engine',                'AI Engine',           'محرك الذكاء الاصطناعي'),
    ('nav', 'item.ai',                       'AI',                  'الذكاء الاصطناعي'),
    ('nav', 'item.dsoc',                     'Security Ops',        'العمليات الأمنية'),
    ('nav', 'item.dnoc',                     'Network Ops',         'عمليات الشبكة'),
    ('nav', 'item.dauth',                    'Identity',            'الهوية والتفويض'),
    ('nav', 'item.tenant',                   'Tenant',              'المستأجر'),
    ('nav', 'item.workspace',                'Workspace',           'مساحة العمل'),
    ('nav', 'item.config-center',            'Config Center',       'مركز الإعدادات'),
    ('nav', 'item.notifications',            'Notifications',       'الإشعارات'),
    ('nav', 'item.inbox',                    'Inbox',               'البريد الوارد'),
    ('nav', 'item.records',                  'Records',             'السجلات'),
    ('nav', 'item.integrations',             'Integrations',        'التكاملات'),
    ('nav', 'item.mcp',                      'MCP',                 'بوابة الأدوات'),
    ('nav', 'item.portals',                  'Portals',             'البوابات'),
    ('nav', 'item.widgets',                  'Widgets',             'الأدوات الذكية'),
    ('nav', 'item.product',                  'Product',             'المنتج'),
    ('nav', 'item.agrc',                     'AGRC',                'AGRC'),
    ('nav', 'item.agrc-os',                  'AGRC OS',             'AGRC OS'),
    ('nav', 'item.platform-admin',           'Platform Admin',      'إدارة المنصة'),
    ('nav', 'item.platform',                 'Platform',            'المنصة'),
    ('nav', 'item.user-profile',             'Profile',             'الملف الشخصي'),
    ('nav', 'item.profile',                  'Profile',             'الملف الشخصي'),
    ('nav', 'item.settings',                 'Settings',            'الإعدادات'),
    ('nav', 'item.tenant-profile',           'Tenant profile',      'ملف المستأجر'),
    ('nav', 'item.tenant-settings',          'Tenant settings',     'إعدادات المستأجر'),
    ('nav', 'item.audit-trail',              'Audit Trail',         'سجل التدقيق'),
    ('nav', 'item.incidents',                'Incidents',           'الحوادث'),
    ('nav', 'item.incident',                 'Incidents',           'الحوادث'),
    ('nav', 'item.issues',                   'Issues',              'المسائل'),
    ('nav', 'item.tasks',                    'Tasks',               'المهام'),
    ('nav', 'item.approvals',                'Approvals',           'الموافقات'),
    ('nav', 'item.activity',                 'Activity',            'النشاط'),
    ('nav', 'item.home',                     'Home',                'الرئيسية'),
    ('nav', 'item.overview',                 'Overview',            'نظرة عامة'),
    ('nav', 'item.dashboard',                'Dashboard',           'لوحة التحكم'),

    -- ── tenant_settings.* ───────────────────────────────────────────
    ('tenant-settings', 'eyebrow',           'administration',      'الإدارة'),
    ('tenant-settings', 'title',             'Tenant Settings',     'إعدادات المستأجر'),
    ('tenant-settings', 'subtitle',          'Workspace-wide configuration. Tenant owner / admin only.', 'تكوين شامل لمساحة العمل. لمالك / مسؤول المستأجر فقط.'),
    ('tenant-settings', 'service.title',     'Service status',      'حالة الخدمة'),
    ('tenant-settings', 'service.message',   'Tenant configuration service is not yet wired. Section surface below is locked to admins; sections will activate as their APIs come online.', 'لم يتم ربط خدمة تكوين المستأجر بعد. الأقسام أدناه مقفلة للمسؤولين؛ ستفعّل عند توفر واجهات برمجتها.'),
    ('tenant-settings', 'service.cta',       'View read-only tenant profile →', 'عرض ملف المستأجر للقراءة فقط ←'),
    ('tenant-settings', 'section.workspace',         'Workspace',                       'مساحة العمل'),
    ('tenant-settings', 'section.workspace.desc',    'Display name, hosts, timezone, default locale, brand colors.', 'الاسم المعروض، المضيفون، المنطقة الزمنية، اللغة الافتراضية، ألوان العلامة التجارية.'),
    ('tenant-settings', 'section.entitlements',      'Modules & Entitlements',                                                  'الوحدات والصلاحيات'),
    ('tenant-settings', 'section.entitlements.desc', 'Which modules are enabled for this tenant; plan tier; seat counts.',     'الوحدات المفعّلة لهذا المستأجر؛ مستوى الخطة؛ عدد المقاعد.'),
    ('tenant-settings', 'section.sso',               'SSO & Identity Provider',         'الدخول الموحد ومزود الهوية'),
    ('tenant-settings', 'section.sso.desc',          'Keycloak realm binding, IdP claims mapping, MFA policy.', 'ربط واقع Keycloak، تعيين مطالبات IdP، سياسة المصادقة الثنائية.'),
    ('tenant-settings', 'section.email',             'Email & Integrations',            'البريد الإلكتروني والتكاملات'),
    ('tenant-settings', 'section.email.desc',        'Outbound SMTP, transactional sender, integration webhooks.', 'SMTP الصادر، المرسل المعاملي، خطافات تكامل الويب.'),
    ('tenant-settings', 'section.risk',              'Risk Model',                      'نموذج المخاطر'),
    ('tenant-settings', 'section.risk.desc',         'Heatmap dimensions, scoring weights, treatment thresholds.', 'أبعاد الخريطة الحرارية، أوزان التقييم، عتبات المعالجة.'),
    ('tenant-settings', 'section.raci',              'RACI & Authority Matrix',         'مصفوفة RACI والصلاحيات'),
    ('tenant-settings', 'section.raci.desc',         'Default RACI assignments, owner approvers, segregation-of-duty.', 'تعيينات RACI الافتراضية، معتمدو المالكين، الفصل بين الواجبات.'),
    ('tenant-settings', 'section.cadence',           'Cadence Overrides',               'تجاوزات الإيقاع'),
    ('tenant-settings', 'section.cadence.desc',      'Review cycles, attestation calendars, evidence schedules.', 'دورات المراجعة، تقاويم الإقرار، جداول الأدلة.'),
    ('tenant-settings', 'section.history',           'Configuration History',           'تاريخ التكوين'),
    ('tenant-settings', 'section.history.desc',      'Audit trail of tenant-config changes (who, when, what).', 'سجل تدقيق لتغييرات تكوين المستأجر (من، متى، ماذا).'),
    ('tenant-settings', 'eyebrow.placeholder',       'PLACEHOLDER',                     'مرحلة أولية'),
    ('tenant-settings', 'eyebrow.coming_soon',       'COMING SOON',                     'قريباً'),
    ('tenant-settings', 'eyebrow.live',              'LIVE',                            'مفعل'),
    ('tenant-settings', 'cta.open',                  'Open',                            'فتح'),
    ('tenant-settings', 'cta.locked',                'Locked',                          'مقفل'),

    -- ── common.action.* ─────────────────────────────────────────────
    ('common', 'action.retry',               'Retry',                'إعادة المحاولة'),
    ('common', 'action.dismiss',             'Dismiss',              'إغلاق')
)
-- Pass 1: ensure every key exists in i18n_keys.
INSERT INTO dos.i18n_keys (ns_key, key, default_locale)
SELECT ns_key, key, 'en' FROM rows
ON CONFLICT (ns_key, key) DO NOTHING;

-- Pass 2: insert EN translations as platform default (one row per key).
WITH rows(ns_key, key, en, ar) AS (
  -- Repeat the same VALUES list — PostgreSQL doesn't carry CTEs across
  -- statements. We materialise the same data once more.
  SELECT ns_key, key, default_locale, default_locale FROM dos.i18n_keys
  WHERE FALSE  -- placeholder; the real rows are joined below
),
seed(ns_key, key, locale, value) AS (
  SELECT k.ns_key, k.key, 'en', t.en
    FROM dos.i18n_keys k
    JOIN (VALUES
      -- Re-emit the same (ns,key,en,ar) tuples used in pass 1 above.
      -- This list MUST stay in sync with the rows() CTE at the top.
      ('workspace','eyebrow','workspace','مساحة العمل'),
      ('workspace','title','Command center','مركز القيادة'),
      ('workspace','welcome','Welcome','مرحبًا'),
      ('workspace','kpi.tenant','Tenant','المستأجر'),
      ('workspace','kpi.status','Status','الحالة'),
      ('workspace','kpi.role','Your role','دورك'),
      ('workspace','kpi.modules','Modules entitled','الوحدات المخصصة'),
      ('status','tenant.active','Active','نشط'),
      ('status','tenant.platform_dna','Platform DNA','منصة أساسية'),
      ('status','tenant.trial_expired','Trial expired','انتهت الفترة التجريبية'),
      ('status','tenant.suspended','Suspended','موقوف'),
      ('role','owner','Owner','مالك'),
      ('role','tenant_owner','Tenant owner','مالك المستأجر'),
      ('role','tenant_admin','Administrator','مسؤول'),
      ('role','member','Member','عضو'),
      ('shell','signout','Sign out','تسجيل الخروج'),
      ('nav','group.primary','Primary','الرئيسية'),
      ('nav','group.secondary','Secondary','الثانوية'),
      ('nav','group.foundation','Foundation','الأساس'),
      ('nav','item.foundation','Foundation','الأساس'),
      ('nav','item.risk','Risk','المخاطر'),
      ('nav','item.compliance','Compliance','الامتثال'),
      ('nav','item.controls','Controls','الضوابط'),
      ('nav','item.evidence','Evidence','الأدلة'),
      ('nav','item.audit','Audit','التدقيق'),
      ('nav','item.knowledge','Knowledge','المعرفة'),
      ('nav','item.reporting','Reporting','التقارير')
      -- NOTE: this short list seeds the high-traffic keys. The full set
      -- is loaded by the resolver stub in TS today; the next migration
      -- (0142) generates the remaining rows from a CSV export of the
      -- resolver map so we don't drift between code + DB.
    ) AS t(ns_key, key, en, ar)
      ON k.ns_key = t.ns_key AND k.key = t.key
)
INSERT INTO dos.i18n_translations (key_id, locale, value, source)
SELECT k.key_id, 'en', s.value, 'platform'
  FROM seed s
  JOIN dos.i18n_keys k ON k.ns_key = s.ns_key AND k.key = s.key
ON CONFLICT DO NOTHING;

-- Pass 3: AR translations.
WITH seed(ns_key, key, value) AS (
  SELECT * FROM (VALUES
      ('workspace','eyebrow','مساحة العمل'),
      ('workspace','title','مركز القيادة'),
      ('workspace','welcome','مرحبًا'),
      ('workspace','kpi.tenant','المستأجر'),
      ('workspace','kpi.status','الحالة'),
      ('workspace','kpi.role','دورك'),
      ('workspace','kpi.modules','الوحدات المخصصة'),
      ('status','tenant.active','نشط'),
      ('status','tenant.platform_dna','منصة أساسية'),
      ('status','tenant.trial_expired','انتهت الفترة التجريبية'),
      ('status','tenant.suspended','موقوف'),
      ('role','owner','مالك'),
      ('role','tenant_owner','مالك المستأجر'),
      ('role','tenant_admin','مسؤول'),
      ('role','member','عضو'),
      ('shell','signout','تسجيل الخروج'),
      ('nav','group.primary','الرئيسية'),
      ('nav','group.secondary','الثانوية'),
      ('nav','group.foundation','الأساس'),
      ('nav','item.foundation','الأساس'),
      ('nav','item.risk','المخاطر'),
      ('nav','item.compliance','الامتثال'),
      ('nav','item.controls','الضوابط'),
      ('nav','item.evidence','الأدلة'),
      ('nav','item.audit','التدقيق'),
      ('nav','item.knowledge','المعرفة'),
      ('nav','item.reporting','التقارير')
  ) AS t(ns_key, key, value)
)
INSERT INTO dos.i18n_translations (key_id, locale, value, source)
SELECT k.key_id, 'ar', s.value, 'platform'
  FROM seed s
  JOIN dos.i18n_keys k ON k.ns_key = s.ns_key AND k.key = s.key
ON CONFLICT DO NOTHING;

-- ── entity_status_labels seed ──────────────────────────────────────
INSERT INTO dos.entity_status_labels (entity_type, status_code, label_key, tone, sort_order) VALUES
  ('tenant', 'active',         'status.tenant.active',         'success',  10),
  ('tenant', 'platform_dna',   'status.tenant.platform_dna',   'info',     20),
  ('tenant', 'trial_expired',  'status.tenant.trial_expired',  'danger',   30),
  ('tenant', 'suspended',      'status.tenant.suspended',      'warning',  40)
ON CONFLICT (entity_type, status_code) DO NOTHING;

-- ── role_labels seed ──────────────────────────────────────────────
INSERT INTO dos.role_labels (role_code, scope, label_key, rank) VALUES
  ('owner',         'tenant', 'role.owner',         10),
  ('tenant_owner',  'tenant', 'role.tenant_owner',  20),
  ('tenant_admin',  'tenant', 'role.tenant_admin',  30),
  ('member',        'tenant', 'role.member',        100)
ON CONFLICT (role_code, scope) DO NOTHING;

COMMIT;
