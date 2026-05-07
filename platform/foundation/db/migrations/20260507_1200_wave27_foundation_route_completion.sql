-- =====================================================================
-- Wave 27 — foundation route completion (template-binding + DUI route rows)
--
-- Root cause (visual probe at shahin-ai.com after Wave 26):
--   `/api/ui-os/template-binding?route=/foundation/settings` returns 404
--   TEMPLATE_BINDING_NOT_FOUND, blocking page render. The same hole exists
--   for every /foundation/* route that is enrolled in
--   dos.dynamic_ui_route_metadata + dos.ui_module_nav_item but is NOT yet
--   populated in:
--     - dos.dynamic_ui_routes  (page-experience contract)
--     - dos.ui_route_template_binding  (archetype + template export)
--
--   Missing routes (28 metadata rows vs 21 routes/bindings):
--     /foundation/data-processing
--     /foundation/ownership-mapping
--     /foundation/settings
--     /foundation/reports
--     /foundation/records
--     /foundation/operations-readiness
--     /foundation/workflows
--
-- Doctrine fix (DB only): seed the missing rows with canonical archetype +
-- registered template-export component keys. No frontend invention.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Part 1 — seed missing dos.dynamic_ui_routes rows (page-experience).
-- module_code='foundation' for all. component_key reused from existing
-- foundation rows so dauth permission_key resolution stays consistent.
-- ---------------------------------------------------------------------
WITH new_routes(path_pattern, component_key, sort_order, page_type, layout,
                title_key, subtitle_key, permission_key) AS (
  VALUES
    ('/foundation/data-processing',     'module.records.page',     220, 'log',       'data-table',
     'foundation.page.data-processing.title',     'foundation.page.data-processing.subtitle',
     'foundation.records.read'),
    ('/foundation/ownership-mapping',   'module.records.page',     230, 'workflow',  'data-table',
     'foundation.page.ownership-mapping.title',   'foundation.page.ownership-mapping.subtitle',
     'foundation.ownership.read'),
    ('/foundation/settings',            'module.settings.page',    240, 'settings',  'form-grid',
     'foundation.page.settings.title',            'foundation.page.settings.subtitle',
     'foundation.settings.read'),
    ('/foundation/reports',             'module.records.page',     250, 'report',    'tile-grid',
     'foundation.page.reports.title',             'foundation.page.reports.subtitle',
     'foundation.reports.read'),
    ('/foundation/records',             'module.records.page',     260, 'directory', 'data-table',
     'foundation.page.records.title',             'foundation.page.records.subtitle',
     'foundation.records.read'),
    ('/foundation/operations-readiness','module.overview.page',    270, 'dashboard', 'tile-grid',
     'foundation.page.operations-readiness.title','foundation.page.operations-readiness.subtitle',
     'foundation.diagnostics.read'),
    ('/foundation/workflows',           'module.workflow_timeline.page',     280, 'workflow',  'kanban',
     'foundation.page.workflows.title',           'foundation.page.workflows.subtitle',
     'foundation.workflows.read')
)
INSERT INTO dos.dynamic_ui_routes (
  tenant_id, module_code, path_pattern, component_key, permission_key,
  sort_order, page_type, layout, title_key, subtitle_key,
  data_scope_mode, audit_enabled, realtime_enabled
)
SELECT NULL, 'foundation', nr.path_pattern, nr.component_key, nr.permission_key,
       nr.sort_order, nr.page_type, nr.layout, nr.title_key, nr.subtitle_key,
       'tenant', TRUE, FALSE
  FROM new_routes nr
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.tenant_id IS NULL AND r.path_pattern = nr.path_pattern
 );

-- ---------------------------------------------------------------------
-- Part 2 — seed missing dos.ui_route_template_binding rows.
-- archetype + template_export reuse existing registry entries.
-- ---------------------------------------------------------------------
WITH new_bindings(route, archetype, template_export,
                  title_en, title_ar, subtitle_en, subtitle_ar) AS (
  VALUES
    ('/foundation/data-processing',     'audit-trail-ledger', 'AuditTrailLedgerTemplateComponent',
     'Data processing',     'معالجة البيانات',
     'Data processing inventory and lawful basis.', 'جرد معالجة البيانات والأساس القانوني.'),
    ('/foundation/ownership-mapping',   'ownership-map',      'OwnershipMapTemplateComponent',
     'Ownership mapping',   'خرائط الملكية',
     'Map ownership across entities and modules.', 'تخطيط الملكية عبر الكيانات والوحدات.'),
    ('/foundation/settings',            'module-settings',    'ModuleSettingsTemplateComponent',
     'Settings',            'الإعدادات',
     'Foundation module settings.', 'إعدادات وحدة المؤسسة.'),
    ('/foundation/reports',             'evidence-reports',   'ExportCenterTemplateComponent',
     'Reports',             'التقارير',
     'Foundation reports and exports.', 'تقارير وعمليات تصدير المؤسسة.'),
    ('/foundation/records',             'intelligent-register','ModuleRecordsTemplateComponent',
     'Records',             'السجلات',
     'Foundation record library.', 'مكتبة سجلات المؤسسة.'),
    ('/foundation/operations-readiness','posture-overview',   'PostureOverviewTemplateComponent',
     'Operations readiness','الجاهزية التشغيلية',
     'Operational readiness signals.', 'مؤشرات الجاهزية التشغيلية.'),
    ('/foundation/workflows',           'workflow-timeline',  'WorkflowTimelineTemplateComponent',
     'Workflows',           'سير العمل',
     'Foundation workflow definitions.', 'تعريفات سير عمل المؤسسة.')
)
INSERT INTO dos.ui_route_template_binding (
  route, archetype, template_export, props,
  title_en, title_ar, subtitle_en, subtitle_ar, status_tags
)
SELECT nb.route, nb.archetype, nb.template_export, '{}'::jsonb,
       nb.title_en, nb.title_ar, nb.subtitle_en, nb.subtitle_ar, '[]'::jsonb
  FROM new_bindings nb
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.ui_route_template_binding b WHERE b.route = nb.route
 );

-- ---------------------------------------------------------------------
-- Self-test
-- ---------------------------------------------------------------------
DO $$
DECLARE missing_routes INT; missing_bindings INT;
BEGIN
  SELECT count(*) INTO missing_routes
    FROM (VALUES
      ('/foundation/data-processing'),('/foundation/ownership-mapping'),
      ('/foundation/settings'),('/foundation/reports'),
      ('/foundation/records'),('/foundation/operations-readiness'),
      ('/foundation/workflows')
    ) v(p)
   WHERE NOT EXISTS (
     SELECT 1 FROM dos.dynamic_ui_routes r
      WHERE r.tenant_id IS NULL AND r.path_pattern = v.p
   );
  IF missing_routes > 0 THEN
    RAISE EXCEPTION 'wave27: % dynamic_ui_routes rows still missing', missing_routes;
  END IF;

  SELECT count(*) INTO missing_bindings
    FROM (VALUES
      ('/foundation/data-processing'),('/foundation/ownership-mapping'),
      ('/foundation/settings'),('/foundation/reports'),
      ('/foundation/records'),('/foundation/operations-readiness'),
      ('/foundation/workflows')
    ) v(p)
   WHERE NOT EXISTS (
     SELECT 1 FROM dos.ui_route_template_binding b WHERE b.route = v.p
   );
  IF missing_bindings > 0 THEN
    RAISE EXCEPTION 'wave27: % ui_route_template_binding rows still missing', missing_bindings;
  END IF;

  RAISE NOTICE 'wave27 proof: 7 foundation routes + 7 template-bindings present';
END$$;

-- Ledger
INSERT INTO public.foundation_schema_migrations (filename, applied_at)
VALUES ('20260507_1200_wave27_foundation_route_completion.sql', NOW())
ON CONFLICT (filename) DO NOTHING;

COMMIT;
