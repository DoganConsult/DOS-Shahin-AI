-- Wave 33 — Foundation KPI Tiles (IBM Carbon cds-tile / cds-clickable-tile)
--
-- ROOT CAUSE:  dos.ui_route_kpi had 0 rows for /foundation/* routes.
--              The template-binding loadProps() queries this table to
--              populate props.kpis → rendered as cds-clickable-tile KPI
--              cards by ModuleOverviewTemplateComponent and all archetype
--              templates that support a kpis strip.
--              Empty kpis[] → blank KPI zone on every Foundation page.
--
-- FIX:         Seed meaningful KPI definitions for every Foundation page
--              that renders a command-home, posture-overview, org-chart,
--              intelligent-register, ownership-map, delegation-center,
--              audit-trail-ledger, or workflow-control archetype.
--
-- DOCTRINE:    DB stores. UI-OS resolves. Frontend renders only DB-driven data.
--              No KPI value is hardcoded in TypeScript.
--              source_path uses dot-path notation resolved by the Angular
--              template against live data from the module API endpoints.
--
-- IDEMPOTENT:  Uses ON CONFLICT DO NOTHING (id is bigserial; uniqueness
--              is enforced by (route, sort_order) composite index guard).
--              Safe to re-run.

BEGIN;

DO $$ BEGIN
  RAISE NOTICE 'Wave 33 — seeding Foundation KPI tiles';
END $$;

-- ── /foundation & /foundation/overview — command-home ────────────────────────
-- Source: /api/foundation/summary or workspace runtime counters
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation',         10, 'Total Users',       'إجمالي المستخدمين',      'summary.totalUsers',         'number',      'info',    '/foundation/users'),
  ('/foundation',         20, 'Active Roles',      'الأدوار النشطة',          'summary.activeRoles',        'number',      'info',    '/foundation/roles'),
  ('/foundation',         30, 'Live Policies',     'السياسات النشطة',         'summary.activePolicies',     'number',      'info',    '/foundation/policies'),
  ('/foundation',         40, 'Open Reviews',      'المراجعات المفتوحة',      'summary.openReviews',        'number',      'warning', '/foundation/access-review'),
  ('/foundation/overview',10, 'Total Users',       'إجمالي المستخدمين',      'summary.totalUsers',         'number',      'info',    '/foundation/users'),
  ('/foundation/overview',20, 'Active Roles',      'الأدوار النشطة',          'summary.activeRoles',        'number',      'info',    '/foundation/roles'),
  ('/foundation/overview',30, 'Live Policies',     'السياسات النشطة',         'summary.activePolicies',     'number',      'info',    '/foundation/policies'),
  ('/foundation/overview',40, 'Open Reviews',      'المراجعات المفتوحة',      'summary.openReviews',        'number',      'warning', '/foundation/access-review'),
  ('/foundation/overview',50, 'Teams',             'الفرق',                   'summary.totalTeams',         'number',      'info',    '/foundation/teams'),
  ('/foundation/overview',60, 'Departments',       'الأقسام',                 'summary.totalDepartments',   'number',      'info',    '/foundation/departments')
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/diagnostics — posture-overview ───────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/diagnostics', 10, 'Posture Score',   'درجة الوضعية',         'scoreKpis.0.value',          'percent',     'info',    NULL),
  ('/foundation/diagnostics', 20, 'Open Gaps',       'الثغرات المفتوحة',     'topGaps.length',             'number',      'warning', NULL),
  ('/foundation/diagnostics', 30, 'Maturity Level',  'مستوى النضج',          'maturityDomains.0.value',    'number',      'info',    NULL),
  ('/foundation/diagnostics', 40, 'Controls Active', 'الضوابط النشطة',       'health.controlsActive',      'number',      'success', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/operations-readiness — posture-overview ──────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/operations-readiness', 10, 'Readiness %',     'جاهزية %',             'scoreKpis.0.value',    'percent', 'info',    NULL),
  ('/foundation/operations-readiness', 20, 'Failing Checks',  'الفحوصات الفاشلة',     'topGaps.length',       'number',  'warning', NULL),
  ('/foundation/operations-readiness', 30, 'Maturity Domains','مجالات النضج',         'maturityDomains.length','number', 'info',    NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/users — intelligent-register ─────────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/users', 10, 'Total Users',     'إجمالي المستخدمين',     'rows.length',           'number', 'info',    NULL),
  ('/foundation/users', 20, 'Active',          'نشط',                   'health.activeUsers',     'number', 'success', NULL),
  ('/foundation/users', 30, 'Pending Review',  'في انتظار المراجعة',    'health.pendingReview',  'number', 'warning', '/foundation/access-review')
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/roles — intelligent-register ─────────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/roles', 10, 'Total Roles',    'إجمالي الأدوار',        'rows.length',           'number', 'info',    NULL),
  ('/foundation/roles', 20, 'Privileged',     'مميز',                  'health.privilegedRoles','number', 'warning', NULL),
  ('/foundation/roles', 30, 'Orphaned',       'يتيم',                  'health.orphanedRoles',  'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/policies — intelligent-register ───────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/policies', 10, 'Total Policies',   'إجمالي السياسات',      'rows.length',             'number', 'info',    NULL),
  ('/foundation/policies', 20, 'Active',            'نشط',                   'health.activePolicies',   'number', 'success', NULL),
  ('/foundation/policies', 30, 'Pending Approval',  'في انتظار الموافقة',   'health.pendingPolicies',  'number', 'warning', NULL),
  ('/foundation/policies', 40, 'Expiring Soon',     'تنتهي قريباً',          'health.expiringPolicies', 'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/teams — org-chart ────────────────────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/teams', 10, 'Total Teams',     'إجمالي الفرق',          'orgChartNodes.length',   'number', 'info', NULL),
  ('/foundation/teams', 20, 'Cross-Function',  'متعدد الوظائف',         'health.crossFuncTeams',  'number', 'info', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/departments — org-chart ──────────────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/departments', 10, 'Departments',   'الأقسام',             'orgChartNodes.length',   'number', 'info', NULL),
  ('/foundation/departments', 20, 'With Owner',    'مع المالك',           'health.ownedDepts',      'number', 'success', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/business-units — org-chart ────────────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/business-units', 10, 'Business Units', 'وحدات الأعمال',     'orgChartNodes.length',  'number', 'info', NULL),
  ('/foundation/business-units', 20, 'Active',         'نشط',                'health.activeBUs',      'number', 'success', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/access-review — workflow-control ──────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/access-review', 10, 'Active Campaigns', 'الحملات النشطة',     'health.activeCampaigns',   'number', 'info',    NULL),
  ('/foundation/access-review', 20, 'Decisions Pending','القرارات المعلقة',   'health.pendingDecisions',  'number', 'warning', NULL),
  ('/foundation/access-review', 30, 'SLA Breaches',     'خروقات مستوى الخدمة','health.slaBreaches',       'number', 'warning', '/foundation/access-review/escalations'),
  ('/foundation/access-review', 40, 'Completion %',     'نسبة الإكمال',       'health.completionRate',    'percent','success', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/delegations — delegation-center ───────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/delegations', 10, 'Active Delegations', 'التفويضات النشطة',    'delegationRules.length',          'number', 'info',    NULL),
  ('/foundation/delegations', 20, 'Expiring (7d)',      'تنتهي (7 أيام)',       'health.expiringDelegations',       'number', 'warning', NULL),
  ('/foundation/delegations', 30, 'High Risk',          'خطر مرتفع',            'health.highRiskDelegations',       'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/ownership-mapping — ownership-map ────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/ownership-mapping', 10, 'Entities Mapped',  'الكيانات المعيّنة',   'ownershipEdges.length',  'number', 'info',    NULL),
  ('/foundation/ownership-mapping', 20, 'No Owner',         'بدون مالك',           'health.unmappedEntities','number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/audit — audit-trail-ledger ────────────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/audit', 10, 'Total Events',    'إجمالي الأحداث',       'auditLedgerRows.length', 'number', 'info',    NULL),
  ('/foundation/audit', 20, 'Hash Verified',   'التجزئة تم التحقق منها','health.hashVerified',    'number', 'success', NULL),
  ('/foundation/audit', 30, 'Critical Events', 'أحداث حرجة',           'health.criticalEvents',  'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/committees — intelligent-register ────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/committees', 10, 'Committees',     'اللجان',              'rows.length',            'number', 'info',    NULL),
  ('/foundation/committees', 20, 'Active',         'نشط',                 'health.activeCommittees','number', 'success', NULL),
  ('/foundation/committees', 30, 'Quorum Required','يتطلب النصاب',        'health.quorumRequired',  'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/permissions — ownership-map ──────────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/permissions', 10, 'Permissions',    'الصلاحيات',           'ownershipEdges.length',  'number', 'info',    NULL),
  ('/foundation/permissions', 20, 'Orphaned Perms', 'صلاحيات يتيمة',       'health.orphanedPerms',   'number', 'warning', NULL),
  ('/foundation/permissions', 30, 'Critical',       'حرج',                 'health.criticalPerms',   'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/positions — intelligent-register ─────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/positions', 10, 'Positions',     'المناصب',             'rows.length',            'number', 'info',    NULL),
  ('/foundation/positions', 20, 'Vacant',        'شاغر',                'health.vacantPositions', 'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/locations — intelligent-register ─────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/locations', 10, 'Locations',       'المواقع',             'rows.length',            'number', 'info',    NULL),
  ('/foundation/locations', 20, 'Active',           'نشط',                 'health.activeLocations', 'number', 'success', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/reference-data — intelligent-register ────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/reference-data', 10, 'Reference Sets', 'مجموعات البيانات المرجعية', 'rows.length',           'number', 'info', NULL),
  ('/foundation/reference-data', 20, 'In Use',         'قيد الاستخدام',              'health.referencesInUse','number', 'success', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/records — intelligent-register ────────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/records', 10, 'Total Records',    'إجمالي السجلات',      'rows.length',           'number', 'info',    NULL),
  ('/foundation/records', 20, 'Pending Action',   'في انتظار الإجراء',   'health.pendingRecords', 'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/organization — org-chart ─────────────────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/organization', 10, 'Organizations',  'المنظمات',          'orgChartNodes.length',   'number', 'info', NULL),
  ('/foundation/organization', 20, 'Hierarchy Depth','عمق التسلسل الهرمي','health.hierarchyDepth',  'number', 'info', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/governance/authority-matrix — ownership-map ──────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/governance/authority-matrix', 10, 'Authority Rules',  'قواعد الصلاحية',     'ownershipEdges.length',   'number', 'info',    NULL),
  ('/foundation/governance/authority-matrix', 20, 'Conflicts',        'التعارضات',           'health.authorityConflicts','number','warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/governance/sod-violations — workflow-control ─────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/governance/sod-violations', 10, 'Open Violations', 'الانتهاكات المفتوحة',  'health.openViolations',    'number', 'warning', NULL),
  ('/foundation/governance/sod-violations', 20, 'Critical',         'حرج',                   'health.criticalViolations','number', 'warning', NULL),
  ('/foundation/governance/sod-violations', 30, 'Resolved (30d)',   'تم الحل (30 يوم)',      'health.resolvedViolations','number', 'success', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/people/lifecycle — workflow-timeline ─────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/people/lifecycle', 10, 'Active Workflows', 'سير العمل النشطة',  'workflowTimelineSteps.length','number', 'info',    NULL),
  ('/foundation/people/lifecycle', 20, 'Overdue',           'متأخر',              'health.overdueSteps',         'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/people/probation-due — workflow-timeline ─────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/people/probation-due', 10, 'Due This Week',  'مستحق هذا الأسبوع', 'workflowTimelineSteps.length','number', 'warning', NULL),
  ('/foundation/people/probation-due', 20, 'Overdue',         'متأخر',              'health.overdueSteps',         'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── /foundation/data-processing — audit-trail-ledger ─────────────────────────
INSERT INTO dos.ui_route_kpi
  (route, sort_order, label_en, label_ar, source_path, format, status, link)
SELECT route, sort_order, label_en, label_ar, source_path, format, status, link
FROM (VALUES
  ('/foundation/data-processing', 10, 'Processing Records', 'سجلات المعالجة',      'auditLedgerRows.length', 'number', 'info',    NULL),
  ('/foundation/data-processing', 20, 'PDPL Compliant',     'متوافق مع نظام البيانات','health.pdplCompliant',  'number', 'success', NULL),
  ('/foundation/data-processing', 30, 'Exceptions',         'استثناءات',             'health.dataExceptions',  'number', 'warning', NULL)
) v(route, sort_order, label_en, label_ar, source_path, format, status, link)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.ui_route_kpi k WHERE k.route = v.route AND k.sort_order = v.sort_order
);

-- ── Validation proof ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_foundation_kpi_count integer;
BEGIN
  SELECT COUNT(*) INTO v_foundation_kpi_count
  FROM dos.ui_route_kpi
  WHERE route LIKE '/foundation%';

  IF v_foundation_kpi_count < 40 THEN
    RAISE EXCEPTION 'Wave 33 validation failed: expected >= 40 Foundation KPI rows, got %', v_foundation_kpi_count;
  END IF;

  RAISE NOTICE 'Wave 33 PASSED: % Foundation KPI rows seeded (dos.ui_route_kpi)', v_foundation_kpi_count;
END $$;

COMMIT;
