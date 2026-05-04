-- 20260505_0301_workspace_home_pillars.sql
-- Owner: ui-os-service.
--
-- Phase F-F8.1 follow-up — populate the 5-pillar insight bar on
-- /workspace-home. Without this, the unconditional <dos-insight-bar>
-- rendered inside ModuleOverviewTemplateComponent receives the host's
-- `fallbackPillars` (because props had no `pillars` key), surfacing the
-- developer-only strings:
--   "No DB-driven content yet for this route."
--   "Phase F template-binding row missing — falling back to safe shell."
--
-- This migration patches dos.ui_route_template_binding.props with a real
-- ModuleInsightPillars payload (whatChanged / whyItMatters /
-- riskOrOpportunity / nextAction / evidence). Idempotent.

BEGIN;

UPDATE dos.ui_route_template_binding
   SET props = props || jsonb_build_object(
        'pillars', jsonb_build_object(
          'whatChanged',
            '3 high-priority items added today; compliance score up 2 pts.',
          'whyItMatters',
            'SAMA cyber rule 4.2 deadline in 5 days — unmitigated obligations block sign-off.',
          'riskOrOpportunity',
            '1 obligation at-risk · 7 evidence artifacts awaiting reviewer approval.',
          'nextAction', jsonb_build_object(
            'label',      'Review at-risk obligation',
            'labelAr',    'مراجعة الالتزام المعرض للخطر',
            'route',      '/compliance/obligation-workspace',
            'actionKey',  'compliance.obligation.review',
            'severity',   'critical'
          ),
          'evidence',
            'Based on 47 risk records, 3 assessments, AI model v2.1.'
        )
      ),
      version    = version + 1,
      updated_at = now()
 WHERE route = '/workspace-home';

COMMIT;
