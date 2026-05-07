-- =====================================================================
-- Wave 35 — Foundation Full Content Seed
-- =====================================================================
-- ROOT CAUSE: Multiple Foundation pages have blank tables, empty KPI
--   strips, no filters, no actions, no NBA recommendations because
--   dos.ui_route_column / dos.ui_route_filter / dos.ui_route_table_action /
--   dos.ui_route_nba were never seeded for those routes.
--
-- ROUTES FIXED:
--   ui_route_column:       /foundation/users, /foundation/roles,
--                          /foundation/reference-data, /foundation/audit,
--                          /foundation/delegations, /foundation/ownership,
--                          /foundation/permissions
--   ui_route_kpi:          /foundation/hierarchy-viz, /foundation/overview,
--                          /foundation/ownership, /foundation/user-lifecycle
--   ui_route_filter:       /foundation/audit, /foundation/delegations,
--                          /foundation/reference-data, /foundation/permissions,
--                          /foundation/ownership
--   ui_route_table_action: /foundation/audit, /foundation/delegations,
--                          /foundation/ownership, /foundation/permissions
--   ui_route_nba:          /foundation/overview, /foundation/users,
--                          /foundation/roles, /foundation/diagnostics,
--                          /foundation/audit
--
-- DOCTRINE: DB stores. UI-OS resolves. Frontend renders only DB-driven data.
-- IDEMPOTENT: All inserts use WHERE NOT EXISTS guards.
-- =====================================================================

BEGIN;

DO $$ BEGIN
  RAISE NOTICE 'Wave 35 — Foundation full content seed (columns, KPIs, filters, actions, NBAs)';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 1. ui_route_column — table columns for intelligent-register /
--    ownership-map / delegation-center / audit-trail-ledger archetypes
-- ═══════════════════════════════════════════════════════════════════

-- /foundation/users
INSERT INTO dos.ui_route_column (route, sort_order, field_key, label_en, label_ar, type, sortable)
SELECT route, sort_order, field_key, label_en, label_ar, type, sortable
FROM (VALUES
  ('/foundation/users', 10, 'displayName',  'Full name',        'الاسم الكامل',       'text',   true),
  ('/foundation/users', 20, 'email',         'Email',            'البريد الإلكتروني',  'text',   true),
  ('/foundation/users', 30, 'department',    'Department',       'القسم',              'text',   true),
  ('/foundation/users', 40, 'role',          'Primary role',     'الدور الرئيسي',      'text',   true),
  ('/foundation/users', 50, 'status',        'Status',           'الحالة',             'status', true),
  ('/foundation/users', 60, 'lastLogin',     'Last login',       'آخر تسجيل دخول',    'date',   true)
) v(route, sort_order, field_key, label_en, label_ar, type, sortable)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_column c WHERE c.route = v.route AND c.field_key = v.field_key
);

-- /foundation/roles
INSERT INTO dos.ui_route_column (route, sort_order, field_key, label_en, label_ar, type, sortable)
SELECT route, sort_order, field_key, label_en, label_ar, type, sortable
FROM (VALUES
  ('/foundation/roles', 10, 'name',             'Role name',         'اسم الدور',         'text',   true),
  ('/foundation/roles', 20, 'description',      'Description',       'الوصف',             'text',   false),
  ('/foundation/roles', 30, 'userCount',        'Users',             'المستخدمون',        'number', true),
  ('/foundation/roles', 40, 'permissionCount',  'Permissions',       'الصلاحيات',         'number', true),
  ('/foundation/roles', 50, 'status',           'Status',            'الحالة',            'status', true)
) v(route, sort_order, field_key, label_en, label_ar, type, sortable)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_column c WHERE c.route = v.route AND c.field_key = v.field_key
);

-- /foundation/reference-data
INSERT INTO dos.ui_route_column (route, sort_order, field_key, label_en, label_ar, type, sortable)
SELECT route, sort_order, field_key, label_en, label_ar, type, sortable
FROM (VALUES
  ('/foundation/reference-data', 10, 'code',        'Code',       'الرمز',     'text',   true),
  ('/foundation/reference-data', 20, 'name',        'Name',       'الاسم',     'text',   true),
  ('/foundation/reference-data', 30, 'category',    'Category',   'الفئة',     'text',   true),
  ('/foundation/reference-data', 40, 'description', 'Description','الوصف',     'text',   false),
  ('/foundation/reference-data', 50, 'status',      'Status',     'الحالة',    'status', true)
) v(route, sort_order, field_key, label_en, label_ar, type, sortable)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_column c WHERE c.route = v.route AND c.field_key = v.field_key
);

-- /foundation/audit (audit-trail-ledger archetype)
INSERT INTO dos.ui_route_column (route, sort_order, field_key, label_en, label_ar, type, sortable)
SELECT route, sort_order, field_key, label_en, label_ar, type, sortable
FROM (VALUES
  ('/foundation/audit', 10, 'timestamp',   'Timestamp',   'الوقت',             'date',   true),
  ('/foundation/audit', 20, 'actor',       'Actor',       'المنفذ',            'text',   true),
  ('/foundation/audit', 30, 'action',      'Action',      'الإجراء',           'text',   true),
  ('/foundation/audit', 40, 'entity',      'Entity',      'الكيان',            'text',   true),
  ('/foundation/audit', 50, 'entityId',    'Entity ID',   'معرف الكيان',       'text',   false),
  ('/foundation/audit', 60, 'severity',    'Severity',    'الخطورة',           'status', true),
  ('/foundation/audit', 70, 'ipAddress',   'IP address',  'عنوان IP',          'text',   false)
) v(route, sort_order, field_key, label_en, label_ar, type, sortable)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_column c WHERE c.route = v.route AND c.field_key = v.field_key
);

-- /foundation/delegations (delegation-center archetype)
INSERT INTO dos.ui_route_column (route, sort_order, field_key, label_en, label_ar, type, sortable)
SELECT route, sort_order, field_key, label_en, label_ar, type, sortable
FROM (VALUES
  ('/foundation/delegations', 10, 'delegator',   'Delegated by',  'مُفوَّض من',       'text',   true),
  ('/foundation/delegations', 20, 'delegate',    'Delegated to',  'مُفوَّض إلى',      'text',   true),
  ('/foundation/delegations', 30, 'permission',  'Permission',    'الصلاحية',         'text',   true),
  ('/foundation/delegations', 40, 'startDate',   'Start date',    'تاريخ البداية',    'date',   true),
  ('/foundation/delegations', 50, 'endDate',     'End date',      'تاريخ الانتهاء',   'date',   true),
  ('/foundation/delegations', 60, 'status',      'Status',        'الحالة',           'status', true)
) v(route, sort_order, field_key, label_en, label_ar, type, sortable)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_column c WHERE c.route = v.route AND c.field_key = v.field_key
);

-- /foundation/ownership (ownership-map archetype)
INSERT INTO dos.ui_route_column (route, sort_order, field_key, label_en, label_ar, type, sortable)
SELECT route, sort_order, field_key, label_en, label_ar, type, sortable
FROM (VALUES
  ('/foundation/ownership', 10, 'entity',        'Entity',          'الكيان',           'text',   true),
  ('/foundation/ownership', 20, 'entityType',    'Type',            'النوع',            'text',   true),
  ('/foundation/ownership', 30, 'owner',         'Owner',           'المالك',           'text',   true),
  ('/foundation/ownership', 40, 'department',    'Department',      'القسم',            'text',   true),
  ('/foundation/ownership', 50, 'ownershipType', 'Ownership type',  'نوع الملكية',      'text',   false),
  ('/foundation/ownership', 60, 'status',        'Status',          'الحالة',           'status', true)
) v(route, sort_order, field_key, label_en, label_ar, type, sortable)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_column c WHERE c.route = v.route AND c.field_key = v.field_key
);

-- /foundation/permissions (ownership-map archetype)
INSERT INTO dos.ui_route_column (route, sort_order, field_key, label_en, label_ar, type, sortable)
SELECT route, sort_order, field_key, label_en, label_ar, type, sortable
FROM (VALUES
  ('/foundation/permissions', 10, 'name',        'Permission name', 'اسم الصلاحية',    'text',   true),
  ('/foundation/permissions', 20, 'resource',    'Resource',        'المورد',           'text',   true),
  ('/foundation/permissions', 30, 'action',      'Action',          'الإجراء',          'text',   true),
  ('/foundation/permissions', 40, 'roleCount',   'Roles',           'الأدوار',          'number', true),
  ('/foundation/permissions', 50, 'userCount',   'Users',           'المستخدمون',       'number', true),
  ('/foundation/permissions', 60, 'status',      'Status',          'الحالة',           'status', true)
) v(route, sort_order, field_key, label_en, label_ar, type, sortable)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_column c WHERE c.route = v.route AND c.field_key = v.field_key
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. ui_route_kpi — KPI tiles for routes with 0 current KPIs
-- ═══════════════════════════════════════════════════════════════════

-- /foundation/hierarchy-viz (org-chart archetype — had 0 KPIs)
INSERT INTO dos.ui_route_kpi (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/hierarchy-viz', 10, 'Total nodes',     'إجمالي العقد',      'summary.totalNodes',       'number',  'info', NULL),
  ('/foundation/hierarchy-viz', 20, 'Depth levels',    'مستويات العمق',     'summary.depthLevels',      'number',  'info', NULL),
  ('/foundation/hierarchy-viz', 30, 'Reporting lines', 'خطوط التقارير',     'summary.reportingLines',   'number',  'info', NULL),
  ('/foundation/hierarchy-viz', 40, 'Leaf nodes',      'العقد الطرفية',     'summary.leafNodes',        'number',  'info', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- /foundation/overview (command-home archetype — had 0 KPIs from shaped table)
INSERT INTO dos.ui_route_kpi (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/overview', 10, 'Total users',       'إجمالي المستخدمين',  'summary.totalUsers',        'number',  'info',    '/foundation/users'),
  ('/foundation/overview', 20, 'Active roles',      'الأدوار النشطة',      'summary.activeRoles',       'number',  'info',    '/foundation/roles'),
  ('/foundation/overview', 30, 'Live policies',     'السياسات النشطة',     'summary.activePolicies',    'number',  'info',    '/foundation/policies'),
  ('/foundation/overview', 40, 'Open reviews',      'المراجعات المفتوحة',  'summary.openReviews',       'number',  'warning', '/foundation/access-review'),
  ('/foundation/overview', 50, 'Teams',             'الفرق',               'summary.totalTeams',        'number',  'info',    '/foundation/teams'),
  ('/foundation/overview', 60, 'Departments',       'الأقسام',             'summary.totalDepartments',  'number',  'info',    '/foundation/departments')
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- /foundation/ownership (ownership-map archetype — had 0 KPIs)
INSERT INTO dos.ui_route_kpi (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/ownership', 10, 'Total assets',     'إجمالي الأصول',     'summary.totalAssets',      'number',  'info',    NULL),
  ('/foundation/ownership', 20, 'Assigned owners',  'الملاك المعينون',    'summary.assignedOwners',   'number',  'success', NULL),
  ('/foundation/ownership', 30, 'Unassigned',       'غير معين',           'summary.unassigned',       'number',  'warning', NULL),
  ('/foundation/ownership', 40, 'High risk',        'عالي الخطورة',       'summary.highRisk',         'number',  'danger',  NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- /foundation/user-lifecycle (workflow-timeline archetype — had 0 KPIs)
INSERT INTO dos.ui_route_kpi (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/user-lifecycle', 10, 'Onboarding',       'قيد التهيئة',       'summary.onboarding',       'number', 'info',    NULL),
  ('/foundation/user-lifecycle', 20, 'Pending review',   'بانتظار المراجعة',  'summary.pendingReview',    'number', 'warning', NULL),
  ('/foundation/user-lifecycle', 30, 'Offboarding',      'قيد الإنهاء',       'summary.offboarding',      'number', 'warning', NULL),
  ('/foundation/user-lifecycle', 40, 'Probation due',    'انتهاء التجربة',    'summary.probationDue',     'number', 'danger',  NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. ui_route_filter — search/filter bar definitions
-- ═══════════════════════════════════════════════════════════════════

-- /foundation/audit
INSERT INTO dos.ui_route_filter
  (route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
SELECT route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json::jsonb
FROM (VALUES
  ('/foundation/audit', 'audit-date-range', 10, 'Date range',   'نطاق التاريخ',  'timestamp',  'between', 'date-range',  '[]'),
  ('/foundation/audit', 'audit-actor',       20, 'Actor',        'المنفذ',         'actor',      'contains','text',        '[]'),
  ('/foundation/audit', 'audit-action-type', 30, 'Action type',  'نوع الإجراء',   'action',     'eq',      'select',      '[{"value":"create","label":"Create"},{"value":"update","label":"Update"},{"value":"delete","label":"Delete"},{"value":"login","label":"Login"},{"value":"logout","label":"Logout"}]'),
  ('/foundation/audit', 'audit-severity',    40, 'Severity',     'الخطورة',        'severity',   'eq',      'select',      '[{"value":"info","label":"Info"},{"value":"warning","label":"Warning"},{"value":"error","label":"Error"},{"value":"critical","label":"Critical"}]')
) v(route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_filter f WHERE f.route = v.route AND f.filter_id = v.filter_id
);

-- /foundation/delegations
INSERT INTO dos.ui_route_filter
  (route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
SELECT route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json::jsonb
FROM (VALUES
  ('/foundation/delegations', 'del-status',     10, 'Status',       'الحالة',         'status',    'eq',      'select',    '[{"value":"active","label":"Active"},{"value":"expired","label":"Expired"},{"value":"revoked","label":"Revoked"},{"value":"pending","label":"Pending"}]'),
  ('/foundation/delegations', 'del-date-range', 20, 'Date range',   'نطاق التاريخ',  'startDate', 'between', 'date-range','[]'),
  ('/foundation/delegations', 'del-delegator',  30, 'Delegated by', 'مُفوَّض من',     'delegator', 'contains','text',      '[]')
) v(route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_filter f WHERE f.route = v.route AND f.filter_id = v.filter_id
);

-- /foundation/reference-data
INSERT INTO dos.ui_route_filter
  (route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
SELECT route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json::jsonb
FROM (VALUES
  ('/foundation/reference-data', 'ref-category', 10, 'Category', 'الفئة',  'category', 'eq',      'select',  '[{"value":"org","label":"Organization"},{"value":"risk","label":"Risk"},{"value":"compliance","label":"Compliance"},{"value":"hr","label":"HR"}]'),
  ('/foundation/reference-data', 'ref-status',   20, 'Status',   'الحالة', 'status',   'eq',      'select',  '[{"value":"active","label":"Active"},{"value":"inactive","label":"Inactive"}]'),
  ('/foundation/reference-data', 'ref-search',   30, 'Search',   'بحث',    'name',     'contains','text',    '[]')
) v(route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_filter f WHERE f.route = v.route AND f.filter_id = v.filter_id
);

-- /foundation/permissions
INSERT INTO dos.ui_route_filter
  (route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
SELECT route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json::jsonb
FROM (VALUES
  ('/foundation/permissions', 'perm-resource', 10, 'Resource', 'المورد',   'resource', 'contains','text',   '[]'),
  ('/foundation/permissions', 'perm-action',   20, 'Action',   'الإجراء',  'action',   'eq',      'select', '[{"value":"read","label":"Read"},{"value":"write","label":"Write"},{"value":"delete","label":"Delete"},{"value":"admin","label":"Admin"}]'),
  ('/foundation/permissions', 'perm-status',   30, 'Status',   'الحالة',   'status',   'eq',      'select', '[{"value":"active","label":"Active"},{"value":"deprecated","label":"Deprecated"}]')
) v(route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_filter f WHERE f.route = v.route AND f.filter_id = v.filter_id
);

-- /foundation/ownership
INSERT INTO dos.ui_route_filter
  (route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
SELECT route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json::jsonb
FROM (VALUES
  ('/foundation/ownership', 'own-type',   10, 'Entity type', 'نوع الكيان', 'entityType', 'eq',      'select', '[{"value":"process","label":"Process"},{"value":"asset","label":"Asset"},{"value":"control","label":"Control"},{"value":"policy","label":"Policy"}]'),
  ('/foundation/ownership', 'own-owner',  20, 'Owner',       'المالك',     'owner',      'contains','text',   '[]'),
  ('/foundation/ownership', 'own-status', 30, 'Status',      'الحالة',     'status',     'eq',      'select', '[{"value":"assigned","label":"Assigned"},{"value":"unassigned","label":"Unassigned"},{"value":"disputed","label":"Disputed"}]')
) v(route, filter_id, sort_order, label_en, label_ar, field_key, operator, control, options_json)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_filter f WHERE f.route = v.route AND f.filter_id = v.filter_id
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. ui_route_table_action — toolbar / row / batch actions
-- ═══════════════════════════════════════════════════════════════════

-- /foundation/audit
INSERT INTO dos.ui_route_table_action
  (route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis)
SELECT route, action_id, scope, sort_order, label_en, label_ar, action_json::jsonb, permission, emphasis
FROM (VALUES
  ('/foundation/audit', 'audit-export',   'toolbar', 10, 'Export',        'تصدير',   '{"kind":"dispatch_event","eventName":"foundation.audit.export"}',  '',  'secondary'),
  ('/foundation/audit', 'audit-view-row', 'row',     10, 'View details',  'عرض',     '{"kind":"dispatch_event","eventName":"foundation.audit.view"}',    '',  'ghost'),
  ('/foundation/audit', 'audit-filter',   'toolbar', 20, 'Filter',        'تصفية',   '{"kind":"open_command"}',                                          '',  'ghost')
) v(route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_table_action a WHERE a.route = v.route AND a.action_id = v.action_id
);

-- /foundation/delegations
INSERT INTO dos.ui_route_table_action
  (route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis)
SELECT route, action_id, scope, sort_order, label_en, label_ar, action_json::jsonb, permission, emphasis
FROM (VALUES
  ('/foundation/delegations', 'del-create',  'toolbar', 10, 'New delegation', 'تفويض جديد', '{"kind":"dispatch_event","eventName":"foundation.delegation.create"}',  'foundation.delegation.create', 'primary'),
  ('/foundation/delegations', 'del-view',    'row',     10, 'View',           'عرض',         '{"kind":"dispatch_event","eventName":"foundation.delegation.view"}',    '',                             'ghost'),
  ('/foundation/delegations', 'del-revoke',  'row',     20, 'Revoke',         'إلغاء',        '{"kind":"dispatch_event","eventName":"foundation.delegation.revoke"}',  'foundation.delegation.revoke', 'danger'),
  ('/foundation/delegations', 'del-batch-revoke', 'batch', 10, 'Revoke selected', 'إلغاء المحدد', '{"kind":"dispatch_event","eventName":"foundation.delegation.batch-revoke"}', 'foundation.delegation.revoke', 'danger')
) v(route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_table_action a WHERE a.route = v.route AND a.action_id = v.action_id
);

-- /foundation/ownership
INSERT INTO dos.ui_route_table_action
  (route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis)
SELECT route, action_id, scope, sort_order, label_en, label_ar, action_json::jsonb, permission, emphasis
FROM (VALUES
  ('/foundation/ownership', 'own-assign',      'toolbar', 10, 'Assign owner', 'تعيين مالك', '{"kind":"dispatch_event","eventName":"foundation.ownership.assign"}',  'foundation.ownership.write', 'primary'),
  ('/foundation/ownership', 'own-edit-row',    'row',     10, 'Edit',         'تعديل',       '{"kind":"dispatch_event","eventName":"foundation.ownership.edit"}',    'foundation.ownership.write', 'ghost'),
  ('/foundation/ownership', 'own-export',      'toolbar', 20, 'Export',       'تصدير',       '{"kind":"dispatch_event","eventName":"foundation.ownership.export"}',  '',                           'secondary')
) v(route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_table_action a WHERE a.route = v.route AND a.action_id = v.action_id
);

-- /foundation/permissions
INSERT INTO dos.ui_route_table_action
  (route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis)
SELECT route, action_id, scope, sort_order, label_en, label_ar, action_json::jsonb, permission, emphasis
FROM (VALUES
  ('/foundation/permissions', 'perm-create',   'toolbar', 10, 'New permission', 'صلاحية جديدة', '{"kind":"dispatch_event","eventName":"foundation.permission.create"}', 'foundation.permission.write', 'primary'),
  ('/foundation/permissions', 'perm-edit-row', 'row',     10, 'Edit',           'تعديل',          '{"kind":"dispatch_event","eventName":"foundation.permission.edit"}',   'foundation.permission.write', 'ghost'),
  ('/foundation/permissions', 'perm-export',   'toolbar', 20, 'Export',         'تصدير',           '{"kind":"dispatch_event","eventName":"foundation.permission.export"}',  '',                            'secondary')
) v(route, action_id, scope, sort_order, label_en, label_ar, action_json, permission, emphasis)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_table_action a WHERE a.route = v.route AND a.action_id = v.action_id
);

-- ═══════════════════════════════════════════════════════════════════
-- 5. ui_route_nba — Next Best Actions (AI-recommended actions)
-- ═══════════════════════════════════════════════════════════════════

-- /foundation/overview
INSERT INTO dos.ui_route_nba
  (route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
SELECT route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity
FROM (VALUES
  ('/foundation/overview', 10, 'Run access review',         'تشغيل مراجعة الوصول',       'Access review cycle is due. Start the review to reduce risk.',                        92, '/foundation/access-review',  '',                          'warning'),
  ('/foundation/overview', 20, 'Investigate SOD violations','التحقيق في انتهاكات SOD',    'Segregation-of-duties conflicts detected across 3 roles.',                            88, '/foundation/sod',            'foundation.sod.read',        'danger'),
  ('/foundation/overview', 30, 'Review expiring delegations','مراجعة التفويضات المنتهية', '5 delegation grants expire within 14 days.',                                          80, '/foundation/delegations',    'foundation.delegation.read', 'warning'),
  ('/foundation/overview', 40, 'Enrich user profiles',      'إثراء بيانات المستخدمين',   '24 users have incomplete department assignment.',                                     72, '/foundation/users',          '',                          'info')
) v(route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_nba n WHERE n.route = v.route AND n.sort_order = v.sort_order
);

-- /foundation/users
INSERT INTO dos.ui_route_nba
  (route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
SELECT route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity
FROM (VALUES
  ('/foundation/users', 10, 'Review inactive users',  'مراجعة المستخدمين غير النشطين', '12 users have not logged in for 90+ days.',             85, '/foundation/users', '',  'warning'),
  ('/foundation/users', 20, 'Enable MFA for all',     'تفعيل المصادقة الثنائية',        '8 users do not have multi-factor authentication enabled.',76, '/foundation/users', '',  'danger'),
  ('/foundation/users', 30, 'Complete onboarding',    'إتمام التهيئة',                  '3 users are pending onboarding checklist completion.',   65, '/foundation/user-lifecycle', '', 'info')
) v(route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_nba n WHERE n.route = v.route AND n.sort_order = v.sort_order
);

-- /foundation/roles
INSERT INTO dos.ui_route_nba
  (route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
SELECT route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity
FROM (VALUES
  ('/foundation/roles', 10, 'Audit unused roles',        'مراجعة الأدوار غير المستخدمة', '7 roles have zero active user assignments.',                 88, '/foundation/roles', 'foundation.roles.read', 'warning'),
  ('/foundation/roles', 20, 'Review privileged access',  'مراجعة الوصول الامتيازي',       'Roles with admin-level permissions need periodic review.',  82, '/foundation/roles', 'foundation.roles.read', 'danger'),
  ('/foundation/roles', 30, 'Merge duplicate roles',     'دمج الأدوار المكررة',            '3 roles appear to have overlapping permissions.',            70, '/foundation/roles', 'foundation.roles.read', 'info')
) v(route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_nba n WHERE n.route = v.route AND n.sort_order = v.sort_order
);

-- /foundation/diagnostics
INSERT INTO dos.ui_route_nba
  (route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
SELECT route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity
FROM (VALUES
  ('/foundation/diagnostics', 10, 'Fix critical gaps',       'إصلاح الثغرات الحرجة',     'Critical control gaps detected. Remediation required.',      95, '/foundation/audit',         '',  'danger'),
  ('/foundation/diagnostics', 20, 'Improve maturity',        'تحسين مستوى النضج',         'Maturity score can increase by completing 3 control areas.',  78, '/foundation/diagnostics',   '',  'info'),
  ('/foundation/diagnostics', 30, 'Review posture trends',   'مراجعة اتجاهات الوضعية',   'Posture declined 4% in the last 30 days.',                   72, '/foundation/diagnostics',   '',  'warning')
) v(route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_nba n WHERE n.route = v.route AND n.sort_order = v.sort_order
);

-- /foundation/audit
INSERT INTO dos.ui_route_nba
  (route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
SELECT route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity
FROM (VALUES
  ('/foundation/audit', 10, 'Export compliance report', 'تصدير تقرير الامتثال', 'Generate audit report for the last quarter.',              85, '/foundation/audit', '', 'info'),
  ('/foundation/audit', 20, 'Review critical events',   'مراجعة الأحداث الحرجة','18 critical-severity audit events need review.',           90, '/foundation/audit', '', 'danger')
) v(route, sort_order, label_en, label_ar, description, ai_score, target_route, permission, severity)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_nba n WHERE n.route = v.route AND n.sort_order = v.sort_order
);

-- ═══════════════════════════════════════════════════════════════════
-- Validation
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
  col_count   INT;
  kpi_count   INT;
  filter_count INT;
  action_count INT;
  nba_count   INT;
BEGIN
  SELECT count(*) INTO col_count FROM dos.ui_route_column WHERE route LIKE '/foundation%';
  SELECT count(*) INTO kpi_count FROM dos.ui_route_kpi WHERE route LIKE '/foundation%';
  SELECT count(*) INTO filter_count FROM dos.ui_route_filter WHERE route LIKE '/foundation%';
  SELECT count(*) INTO action_count FROM dos.ui_route_table_action WHERE route LIKE '/foundation%';
  SELECT count(*) INTO nba_count FROM dos.ui_route_nba WHERE route LIKE '/foundation%';

  IF col_count < 30 THEN
    RAISE EXCEPTION 'wave35: only % column rows, expected ≥30', col_count;
  END IF;
  IF kpi_count < 30 THEN
    RAISE EXCEPTION 'wave35: only % KPI rows, expected ≥30', kpi_count;
  END IF;
  IF filter_count < 10 THEN
    RAISE EXCEPTION 'wave35: only % filter rows, expected ≥10', filter_count;
  END IF;
  IF action_count < 8 THEN
    RAISE EXCEPTION 'wave35: only % action rows, expected ≥8', action_count;
  END IF;
  IF nba_count < 10 THEN
    RAISE EXCEPTION 'wave35: only % NBA rows, expected ≥10', nba_count;
  END IF;

  RAISE NOTICE 'wave35 proof: columns=%, kpis=%, filters=%, actions=%, nbas=%',
    col_count, kpi_count, filter_count, action_count, nba_count;
END$$;

COMMIT;
