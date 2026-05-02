-- Compliance module — canonical Shahin-AI SPA routes (per spec §28.4).
--
-- Adds the 6 routes from the canonical compliance archetype mapping that were
-- missing from 002/005 seeds:
--   /compliance/controls         → Control Library Matrix
--   /compliance/controls/:id     → Control 360 (object page)
--   /compliance/evidence         → Evidence Binder
--   /compliance/regulator        → Regulator readiness portal
--   /compliance/ksa              → KSA sector maturity analytics
--   /compliance/diagnostics      → Compliance diagnostics admin surface
--
-- Idempotent: WHERE NOT EXISTS guards. tenant_id NULL = template for all enrolled tenants.
-- Component keys must be added to COMPONENT_MAP (allowlist) and to
-- application/ui/register-components.ts before the SPA can resolve them.

BEGIN;

-- ── Routes ──────────────────────────────────────────────────────────
-- title_key MUST be NOT NULL per §10 drift gate; sourced from i18n catalog.
INSERT INTO dos.dynamic_ui_routes (
  tenant_id, module_code, path_pattern, component_key, permission_key, sort_order,
  page_type, layout, kpi_scope, user_intent, signature_widget,
  data_scope_mode, evidence_required, empty_state_key, error_state_key, help_key,
  title_key
)
SELECT NULL, 'compliance', src.path_pattern, src.component_key, src.permission_key, src.sort_order,
       src.page_type, src.layout, src.kpi_scope, src.user_intent, src.signature_widget,
       'tenant', src.evidence_required, src.empty_state_key, src.error_state_key, src.help_key,
       src.title_key
-- Permission keys must match dos.permissions.permission_id (FK-enforced).
-- Map to existing canonical compliance perms; admin → compliance.manage.
FROM (VALUES
  ('/compliance/controls',         'ComplianceControlsPage',        'compliance.control.read',     220, 'list',     'full-page',   'none',       'manage',      'control-library-matrix', true,  'compliance.emptyState.controls',     'compliance.errorState.list',     'compliance.help.controls',     'compliance.nav.controls'),
  ('/compliance/controls/:id',     'ComplianceControlDetailPage',   'compliance.control.read',     225, 'object',   'object-page', 'none',       'manage',      'entity-360',             true,  'compliance.emptyState.controlDetail','compliance.errorState.detail',  'compliance.help.controlDetail','compliance.controls.detail.title'),
  ('/compliance/evidence',         'ComplianceEvidencePage',        'compliance.evidence.review',  230, 'list',     'full-page',   'none',       'manage',      'evidence-binder',        true,  'compliance.emptyState.evidence',     'compliance.errorState.list',     'compliance.help.evidence',     'compliance.nav.evidence'),
  ('/compliance/regulator',        'ComplianceRegulatorPage',       'compliance.read',             240, 'object',   'split-view',  'page-local', 'monitor',     'framework-mapping',      true,  'compliance.emptyState.regulator',    'compliance.errorState.detail',   'compliance.help.regulator',    'compliance.nav.regulator'),
  ('/compliance/ksa',              'ComplianceKsaPage',             'compliance.read',             250, 'analytics','dashboard',   'page-local', 'monitor',     'framework-mapping',      false, 'compliance.emptyState.ksa',          'compliance.errorState.dashboard','compliance.help.ksa',          'compliance.nav.ksa'),
  ('/compliance/diagnostics',      'ComplianceDiagnosticsPage',     'compliance.manage',           260, 'settings', 'full-page',   'none',       'investigate', 'smart-data-grid',        false, 'compliance.emptyState.diagnostics',  'compliance.errorState.diagnostics','compliance.help.diagnostics', 'compliance.nav.diagnostics')
) AS src(
  path_pattern, component_key, permission_key, sort_order,
  page_type, layout, kpi_scope, user_intent, signature_widget,
  evidence_required, empty_state_key, error_state_key, help_key, title_key
)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL AND r.module_code = 'compliance' AND r.path_pattern = src.path_pattern
);

-- ── Navigation entries (ones that should appear in the module nav strip) ────
INSERT INTO dos.dynamic_ui_navigation (tenant_id, module_code, label, route, sort_order, parent_id)
SELECT NULL, 'compliance', src.label, src.route, src.sort_order, NULL
FROM (VALUES
  ('Controls',     '/compliance/controls',     220),
  ('Evidence',     '/compliance/evidence',     230),
  ('Regulator',    '/compliance/regulator',    240),
  ('KSA',          '/compliance/ksa',          250),
  ('Diagnostics',  '/compliance/diagnostics',  260)
) AS src(label, route, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_navigation n
  WHERE n.tenant_id IS NULL AND n.module_code = 'compliance' AND n.route = src.route
);

COMMIT;
