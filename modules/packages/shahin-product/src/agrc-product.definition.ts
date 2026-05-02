// @ts-nocheck — module-layer imports not yet extracted
import { registerProduct, ProductDefinition, type RoleLandingConfig } from '@dos/contracts';
import { AGRC_AGENTS } from './agrc-agents';
import { SHAHIN_REGISTRATION_DEFAULTS } from './defaults/registration-defaults';

const AGRC_ALL_MODULES = [
  'governance', 'risk', 'compliance', 'evidence', 'reporting', 'assessment',
  'workflow', 'ai', 'vendor', 'incident', 'bcp', 'privacy', 'training',
  'integration', 'platform', 'policy', 'audit', 'action', 'qiyas',
];

export const AGRC_ROLE_LANDINGS: RoleLandingConfig = {
  landingMap: {
    owner: '/workspace-home',
    admin: '/workspace-home',
    compliance_officer: '/compliance/overview',
    risk_manager: '/risk/overview',
    auditor: '/audit/overview',
    viewer: '/workspace-home',
  },
  modulesMap: {
    owner: AGRC_ALL_MODULES,
    admin: ['governance', 'risk', 'compliance', 'evidence', 'reporting', 'assessment', 'workflow', 'ai'],
    compliance_officer: ['governance', 'compliance', 'evidence', 'reporting', 'assessment', 'workflow'],
    risk_manager: ['risk', 'compliance', 'evidence', 'reporting', 'assessment', 'workflow'],
    auditor: ['governance', 'risk', 'compliance', 'evidence', 'reporting', 'assessment'],
    viewer: ['governance', 'risk', 'compliance', 'evidence', 'reporting'],
  },
  widgetsMap: {
    owner: ['risk_heatmap', 'compliance_score', 'executive_summary', 'audit_readiness'],
    admin: ['risk_heatmap', 'compliance_score', 'control_progress', 'evidence_locker', 'audit_readiness', 'executive_summary'],
    compliance_officer: ['compliance_score', 'framework_coverage', 'control_progress', 'evidence_locker', 'audit_readiness'],
    risk_manager: ['risk_heatmap', 'risk_summary', 'compliance_score', 'control_progress', 'vendor_risk'],
    auditor: ['audit_readiness', 'evidence_locker', 'compliance_score', 'risk_heatmap'],
    viewer: ['compliance_score', 'risk_heatmap', 'executive_summary'],
  },
};
import { AGRC_NAV_ITEMS, AGRC_ROLE_NAV_CONFIGS } from './agrc-nav';
import { AGRC_KPI_DEFINITIONS, AGRC_ROLE_KPI_PRIORITY } from './agrc-kpis';
import { AGRC_EVENT_NAMESPACES } from './agrc-events';
import { AGRC_JOBS } from './agrc-jobs';
import { AGRC_SEEDS } from './agrc-seeds';
import { AGRC_ROUTES } from './agrc-routes';

export const AGRC_PRODUCT_DEFINITION: ProductDefinition = {
  code: 'agrc',
  pack_key: 'agrc_product',
  pack_name: 'Shahin-AI Product Pack',
  version: '1.0.0',
  pack_type: 'product',
  description: 'Shahin-AI Product Suite — Hosted on Dogan-OS Platform',
  modules: {
    foundation: true, admin: true, workflow: true, notification: true, team: true, inbox: true,
    ai: true, 'ai-governance': true,
    governance: true, risk: true, compliance: true, policy: true, evidence: true, audit: true,
    incident: true, exception: true, vendor: true, bcp: true, asset: true, remediation: true,
    action: true, training: true, qiyas: true, reporting: true, analytics: true,
    issues: true, records: true, privacy: true,
    integrations: true, portals: true,
  },
  /** @seed Default feature flags — synced to DB via syncProductToDb().
   *  Runtime reads should use getFeatureFlag() from feature-flag.service.ts. */
  feature_flags: {
    agrc_engine_enabled: true,
    agrc_control_monitor_enabled: true,
    agrc_remediation_monitor_enabled: true,
    agrc_kri_monitor_enabled: true,
    agrc_policy_review_enabled: true,
    agrc_auto_task_creation_enabled: true,
    agrc_auto_notification_enabled: true,
  },
  role_pack: {
    seed_roles: [
      'admin', 'executive_owner', 'grc_manager', 'audit_manager',
      'risk_manager', 'compliance_lead', 'data_governance_lead',
      'risk_lead', 'auditor', 'viewer',
    ],
    home_by_role: {
      executive_owner: '/executive/overview',
      grc_manager: '/governance/overview',
      audit_manager: '/audit/mission-board',
      risk_manager: '/risk/register',
      compliance_lead: '/compliance/overview',
      data_governance_lead: '/data-governance/overview',
    },
    default_modules: ['agrc', 'qiyas'],
    default_widgets: ['risk_summary', 'tasks', 'findings', 'compliance_score'],
  },
  dashboard_pack: {
    layouts: ['big_picture', 'risk_command', 'compliance_overview', 'audit_hub'],
    default_dashboard: 'big_picture',
  },
  widget_definitions: [
    { widget_key: 'executive-summary', label_en: 'Executive Summary', label_ar: 'الملخص التنفيذي', module_code: 'dashboard', component_key: 'engine-executive-summary-widget', default_width: 12, default_height: 3, default_config: {}, sort_order: 10 },
    { widget_key: 'top-breached-kris', label_en: 'Top Breached KRIs', label_ar: 'أعلى مؤشرات المخاطر المتجاوزة', module_code: 'risk', component_key: 'top-breached-kris-widget', default_width: 6, default_height: 4, default_config: {}, sort_order: 20 },
    { widget_key: 'policy-review-debt', label_en: 'Policy Review Debt', label_ar: 'ديون مراجعة السياسات', module_code: 'governance', component_key: 'policy-review-debt-widget', default_width: 6, default_height: 4, default_config: {}, sort_order: 30 },
    { widget_key: 'engine-trend', label_en: 'Engine Trend', label_ar: 'اتجاه المحرك', module_code: 'dashboard', component_key: 'engine-trend-widget', default_width: 12, default_height: 5, default_config: {}, sort_order: 40 },
  ],
  dashboard_definitions: [
    {
      dashboard_code: 'shahin-executive',
      name_en: 'Shahin-AI Executive',
      name_ar: 'لوحة Shahin-AI التنفيذية',
      audience: 'executive',
      module_code: 'dashboard',
      route: '/executive/overview',
      layout: {
        version: 2,
        widgets: [
          { widgetKey: 'executive-summary', x: 0, y: 0, w: 12, h: 3, config: {} },
          { widgetKey: 'top-breached-kris', x: 0, y: 3, w: 6, h: 4, config: {} },
          { widgetKey: 'policy-review-debt', x: 6, y: 3, w: 6, h: 4, config: {} },
          { widgetKey: 'engine-trend', x: 0, y: 7, w: 12, h: 5, config: {} },
        ],
      },
      sort_order: 1,
      role_bindings: [
        { role_code: 'executive_owner', is_allowed: true, is_default: true },
        { role_code: 'tenant_admin', is_allowed: true, is_default: true },
        { role_code: 'grc_manager', is_allowed: true, is_default: false },
        { role_code: 'risk_manager', is_allowed: true, is_default: false },
        { role_code: 'auditor', is_allowed: true, is_default: false },
      ],
    },
  ],
  workflow_pack: {
    template_definitions: [
      {
        name: 'Evidence Request',
        description: 'Evidence request workflow',
        definition: { states: ['open', 'in_review', 'approved', 'rejected'], transitions: [{ from: 'open', to: 'in_review' }, { from: 'in_review', to: 'approved' }, { from: 'in_review', to: 'rejected' }], slaHours: 72 },
        parameters_schema: { type: 'object', properties: { control_id: { type: 'string' }, due_at: { type: 'string' } } },
      },
      {
        name: 'Remediation Closure',
        description: 'Remediation closure workflow',
        definition: { states: ['open', 'in_progress', 'validation', 'closed'], transitions: [{ from: 'open', to: 'in_progress' }, { from: 'in_progress', to: 'validation' }, { from: 'validation', to: 'closed' }], slaHours: 168 },
        parameters_schema: { type: 'object', properties: { finding_id: { type: 'string' }, due_at: { type: 'string' } } },
      },
      {
        name: 'Policy Review',
        description: 'Policy review workflow',
        definition: { states: ['open', 'review', 'approval', 'published'], transitions: [{ from: 'open', to: 'review' }, { from: 'review', to: 'approval' }, { from: 'approval', to: 'published' }], slaHours: 336 },
        parameters_schema: { type: 'object', properties: { policy_id: { type: 'string' } } },
      },
      {
        name: 'KRI Breach Review',
        description: 'KRI breach review workflow',
        definition: { states: ['open', 'analysis', 'decision', 'closed'], transitions: [{ from: 'open', to: 'analysis' }, { from: 'analysis', to: 'decision' }, { from: 'decision', to: 'closed' }], slaHours: 48 },
        parameters_schema: { type: 'object', properties: { kri_id: { type: 'string' }, risk_id: { type: 'string' } } },
      },
    ],
  },
  content_pack_installations: [
    { pack_id: 'pack_agrc_core', version: '1.0.0' },
    { pack_id: 'pack_qiyas_core', version: '1.0.0' },
  ],

  agents: AGRC_AGENTS,
  // Law 3: RBAC is data-driven. Roles/permissions/mappings are seeded into DB
  // by module-security-seeder.service.ts at startup, not defined as static TS constants.
  rbac: {
    roleLandings: AGRC_ROLE_LANDINGS,
  },
  nav: AGRC_NAV_ITEMS,
  kpis: AGRC_KPI_DEFINITIONS,
  eventNamespaces: AGRC_EVENT_NAMESPACES,
  jobs: AGRC_JOBS,
  seeds: AGRC_SEEDS,
  routes: AGRC_ROUTES,
  registrationDefaults: SHAHIN_REGISTRATION_DEFAULTS,
};

registerProduct(AGRC_PRODUCT_DEFINITION);
