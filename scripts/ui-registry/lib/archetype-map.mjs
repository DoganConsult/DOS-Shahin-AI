/**
 * Shared archetype/template mapping used by ui-registry:{import,diff,seed:dev}.
 *
 * Maps a Dynamic-UI component_key to one of the 13 canonical archetypes and
 * its ESM export from `@platform/shell/templates`. Mirrors:
 *   - chk_archetype constraint in 20260503_0017_phase_f_ui_route_template_binding.sql
 *   - ARCHETYPE_EXPORTS in scripts/ci-guards/template-coverage.mjs
 *   - REGISTRY_COMPONENT_MAP / archetype routing in platform/dos/registry/component-map.ts
 *
 * Returns { archetype, template_export } or null when no canonical archetype
 * applies (caller should skip such routes — they remain on the
 * component-map default).
 */
export function mapComponentKeyToArchetype(componentKey, route = '') {
  const k = String(componentKey || '');
  const r = String(route || '');

  // ── Universal `module.*` slugs (preferred per universal seed standard) ────
  if (/^module\.(entry|overview)\.page$/.test(k))
    return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
  if (k === 'module.posture.page')
    return { archetype: 'posture-overview', template_export: 'PostureOverviewTemplateComponent' };
  if (k === 'module.records.page')
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };
  if (k === 'module.heatmap.page')
    return { archetype: 'risk-landscape', template_export: 'ModuleHeatmapTemplateComponent' };
  if (k === 'module.workflows.page')
    return { archetype: 'workflow-control', template_export: 'ModuleAssessmentsTemplateComponent' };
  if (k === 'module.trends.page')
    return { archetype: 'trend-intelligence', template_export: 'TrendIntelligenceTemplateComponent' };
  if (k === 'module.reports.page')
    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
  if (k === 'module.work_queue' || k === 'module.workqueue.page' || k === 'module.queue.page')
    return { archetype: 'action-queue', template_export: 'ModuleWorkQueueTemplateComponent' };
  if (k === 'module.settings.page')
    return { archetype: 'module-settings', template_export: 'ModuleSettingsTemplateComponent' };
  if (k === 'module.record.detail' || /\.detail$/.test(k))
    return { archetype: 'record-story', template_export: 'RecordStoryTemplateComponent' };
  if (k === 'module.record.create' || /\.create$/.test(k))
    return { archetype: 'guided-create', template_export: 'GuidedCreateTemplateComponent' };
  if (k === 'module.ai.advisor' || /\.advisor$/.test(k))
    return { archetype: 'ai-advisor', template_export: 'AiAdvisorTemplateComponent' };
  if (k === 'product-wc.checklist' || /onboarding|activation/i.test(k))
    return { archetype: 'activation-journey', template_export: 'ActivationJourneyTemplateComponent' };

  // ── Per-module page-key conventions (PascalCase suffix patterns) ─────────
  if (/HeatmapPage$/.test(k) || /\.heatmap\.page$/.test(k))
    return { archetype: 'risk-landscape', template_export: 'ModuleHeatmapTemplateComponent' };
  if (/PosturePage$/.test(k) || /\.posture\.page$/.test(k))
    return { archetype: 'posture-overview', template_export: 'PostureOverviewTemplateComponent' };
  if (/AssessmentsPage$/.test(k) || /\.assessments\.page$/.test(k))
    return { archetype: 'workflow-control', template_export: 'ModuleAssessmentsTemplateComponent' };
  if (/(Register|List|Records|Findings|Incidents|Alerts|Vendors|Assets|Policies|Frameworks|Controls)Page$/.test(k))
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };
  if (/ReportsPage$/.test(k) || /\.reports\.page$/.test(k))
    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
  if (/(WorkQueue|Queue)Page$/.test(k) || /\.work_queue$/.test(k))
    return { archetype: 'action-queue', template_export: 'ModuleWorkQueueTemplateComponent' };
  if (/SettingsPage$/.test(k) || /\.settings\.page$/.test(k))
    return { archetype: 'module-settings', template_export: 'ModuleSettingsTemplateComponent' };
  if (/(Overview|Home)Page$/.test(k) || /\.overview\.page$/.test(k) || /\.entry\.page$/.test(k))
    return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
  if (/(Trends|Trend)Page$/.test(k) || /\.trends\.page$/.test(k))
    return { archetype: 'trend-intelligence', template_export: 'TrendIntelligenceTemplateComponent' };

  // ── Admin-SPA prefixed component_keys (Phase A admin routes) ────────────
  // Every admin module emits keys like `<vendor>.<module>.<view>` or
  // `<widget-shape>.<entity>` (page-masthead.*, smart-grid.*, audit-timeline.*,
  // matrix.*, command-center.*, forensic-timeline.*, assertion-dashboard.*).
  if (/^page-masthead\./.test(k) || /^command-center(\.|$)/.test(k))
    return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
  if (/^smart-grid\./.test(k) || /^smart-data-grid(\.|$)/.test(k))
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };
  if (/^audit-timeline\./.test(k) || /^forensic-timeline(\.|$)/.test(k))
    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
  if (/^matrix\./.test(k))
    return { archetype: 'risk-landscape', template_export: 'ModuleHeatmapTemplateComponent' };
  if (/^assertion-dashboard(\.|$)/.test(k))
    return { archetype: 'posture-overview', template_export: 'PostureOverviewTemplateComponent' };

  // ── Platform admin keys: `platform.<module>.<view>` ─────────────────────
  if (/^platform\./.test(k)) {
    const view = k.split('.').pop() ?? '';
    if (view === 'overview') return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
    if (view === 'audit')    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
    if (view === 'governance' || view === 'policies' || view === 'lifecycle')
      return { archetype: 'module-settings', template_export: 'ModuleSettingsTemplateComponent' };
    if (view === 'metrics' || view === 'health' || view === 'engine' || view === 'gateway')
      return { archetype: 'trend-intelligence', template_export: 'TrendIntelligenceTemplateComponent' };
    // Default platform view = list-of-things → intelligent-register
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };
  }

  // ── Route-suffix fallback (for routes whose component_key is generic) ────
  const tail = r.replace(/\/$/, '').split('/').pop() ?? '';
  if (tail === 'overview' || tail === '')
    return { archetype: 'command-home', template_export: 'ModuleOverviewTemplateComponent' };
  if (tail === 'settings' || tail === 'flags')
    return { archetype: 'module-settings', template_export: 'ModuleSettingsTemplateComponent' };
  if (tail === 'reports')
    return { archetype: 'evidence-reports', template_export: 'ModuleReportsTemplateComponent' };
  if (tail === 'heatmap')
    return { archetype: 'risk-landscape', template_export: 'ModuleHeatmapTemplateComponent' };
  if (tail === 'register' || tail === 'records')
    return { archetype: 'intelligent-register', template_export: 'ModuleRecordsTemplateComponent' };

  return null;
}

export const ALLOWED_ARCHETYPES = new Set([
  'command-home','posture-overview','intelligent-register','risk-landscape',
  'workflow-control','trend-intelligence','evidence-reports','action-queue',
  'module-settings','record-story','guided-create','ai-advisor','activation-journey',
]);
