-- Compliance module — global navigation, SPA routes, and shell.
-- tenant_id NULL = template applied for all enrolled tenants.
--
-- component_key values (`ComplianceHome`, `ComplianceCatchAll`, etc.) MUST be
-- registered in the Angular compile-time COMPONENT_MAP allowlist for UPOR
-- shadow checks. W6 wires the actual library; until then these keys are the
-- contract surface that the SPA must register.
--
-- Sub-route catalog mirrors `ui/routes/compliance.module.routes.ts`. Top-level
-- nav stays a single entry; deep links resolve via the catch-all pattern.

-- ── Navigation ──────────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_navigation (tenant_id, module_code, label, route, sort_order, parent_id)
SELECT NULL, 'compliance', 'Compliance', '/compliance', 30, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_navigation n
  WHERE n.tenant_id IS NULL AND n.module_code = 'compliance' AND n.route = '/compliance'
);

-- ── Routes (SPA path patterns) ─────────────────────────────────────────
-- Order: home → most-trafficked workspaces → catch-all last.
--
-- component_key MUST exactly match a key in COMPONENT_MAP
-- (products/shahin-ai/app/src/app/blueprint/core/dos/registry/component-map.ts).
-- Convention: bare names (`ComplianceHome`, `ComplianceCatchAll`) for shell
-- stubs (mirrors Foundation), `*Page` suffix for everything else.
INSERT INTO dos.dynamic_ui_routes (tenant_id, module_code, path_pattern, component_key, permission_key, sort_order)
SELECT NULL, 'compliance', src.path_pattern, src.component_key, src.permission_key, src.sort_order
FROM (VALUES
  ('/compliance',                       'ComplianceHome',                    NULL,                         10),
  ('/compliance/overview',              'ComplianceOverviewPage',            'compliance.read',            20),
  ('/compliance/posture',               'CompliancePosturePage',             'compliance.read',            30),
  ('/compliance/work-queue',            'ComplianceWorkQueuePage',           'compliance.read',            40),
  ('/compliance/calendar',              'ComplianceCalendarPage',            'compliance.read',            50),
  ('/compliance/heatmap',               'ComplianceHeatmapPage',             'compliance.read',            60),
  ('/compliance/roadmap',               'ComplianceRoadmapPage',             'compliance.read',            70),
  ('/compliance/templates',             'ComplianceTemplatesPage',           'compliance.read',            80),
  ('/compliance/frameworks',            'ComplianceFrameworksPage',          'framework.record.read',      90),
  ('/compliance/obligations',           'ComplianceObligationsPage',         'compliance.read',           100),
  ('/compliance/obligations/:id',       'ObligationDetailPage',              'compliance.read',           110),
  ('/compliance/obligation-workspace',  'ObligationWorkspacePage',           'compliance.read',           120),
  ('/compliance/regulatory-changes',    'ComplianceRegulatoryChangesPage',   'compliance.read',           130),
  ('/compliance/assessments',           'ComplianceAssessmentsPage',         'assessment.record.read',    140),
  ('/compliance/attestations',          'ComplianceAttestationsPage',        'compliance.read',           150),
  ('/compliance/findings',              'ComplianceFindingsPage',            'compliance.read',           160),
  ('/compliance/gaps',                  'ComplianceGapsPage',                'compliance.read',           170),
  ('/compliance/exceptions',            'ComplianceExceptionsPage',          'compliance.read',           180),
  ('/compliance/evidence-ops',          'ComplianceEvidenceOpsPage',         'compliance.read',           190),
  ('/compliance/reports',               'ComplianceReportsPage',             'compliance.read',           200),
  ('/compliance/lifecycle',             'GenericModuleLifecycle',            'compliance.admin',          210),
  ('/compliance/admin',                 'ComplianceAdminPage',               'compliance.admin',          220),
  ('/compliance/assertion-dashboard',   'AssertionDashboardPage',            'compliance.read',           230),
  ('/compliance/rcsa-campaigns',        'RcsaCampaignsPage',                 'assessment.record.read',    240),
  ('/compliance/regulatory-reasoning-studio', 'RegulatoryReasoningStudioPage','compliance.read',          250),
  ('/compliance/**',                    'ComplianceCatchAll',                NULL,                        900)
) AS src(path_pattern, component_key, permission_key, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL
    AND r.module_code = 'compliance'
    AND r.path_pattern = src.path_pattern
);

-- ── Backfill: collapse legacy bare-name component_keys onto *Page suffix.
--    Idempotent — earlier installs of this seed inserted bare names that
--    don't resolve in COMPONENT_MAP. Bring those rows into spec.
UPDATE dos.dynamic_ui_routes SET component_key = src.new_key
FROM (VALUES
  ('CompliancePage',                  'ComplianceOverviewPage'),
  ('CompliancePosture',               'CompliancePosturePage'),
  ('ComplianceWorkQueue',             'ComplianceWorkQueuePage'),
  ('ComplianceCalendar',              'ComplianceCalendarPage'),
  ('ComplianceHeatMap',               'ComplianceHeatmapPage'),
  ('ComplianceRoadmap',               'ComplianceRoadmapPage'),
  ('ComplianceTemplates',             'ComplianceTemplatesPage'),
  ('ComplianceFrameworks',            'ComplianceFrameworksPage'),
  ('ComplianceObligations',           'ComplianceObligationsPage'),
  ('ObligationDetail',                'ObligationDetailPage'),
  ('ObligationWorkspace',             'ObligationWorkspacePage'),
  ('ComplianceRegulatoryChanges',     'ComplianceRegulatoryChangesPage'),
  ('ComplianceAssessments',           'ComplianceAssessmentsPage'),
  ('ComplianceAttestations',          'ComplianceAttestationsPage'),
  ('ComplianceFindings',              'ComplianceFindingsPage'),
  ('ComplianceGaps',                  'ComplianceGapsPage'),
  ('ComplianceExceptions',            'ComplianceExceptionsPage'),
  ('ComplianceEvidenceOps',           'ComplianceEvidenceOpsPage'),
  ('ComplianceReports',               'ComplianceReportsPage'),
  ('ComplianceAdmin',                 'ComplianceAdminPage'),
  ('AssertionDashboard',              'AssertionDashboardPage'),
  ('RcsaCampaigns',                   'RcsaCampaignsPage'),
  ('RegulatoryReasoningStudio',       'RegulatoryReasoningStudioPage')
) AS src(old_key, new_key)
WHERE dos.dynamic_ui_routes.tenant_id IS NULL
  AND dos.dynamic_ui_routes.module_code = 'compliance'
  AND dos.dynamic_ui_routes.component_key = src.old_key;

-- ── Shell layout ───────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_shells (module_code, layout_version, layout)
VALUES (
  'compliance',
  '1',
  '{"regions":{"header":[],"sidebar":[],"main":[{"componentKey":"ComplianceHome"}]}}'::jsonb
)
ON CONFLICT (module_code) DO UPDATE SET
  layout = EXCLUDED.layout,
  layout_version = EXCLUDED.layout_version,
  updated_at = now();
