/**
 * Module UI Registry — static catalog of all module UI metadata.
 *
 * This defines WHAT EXISTS in the UI (components, icons, routes).
 * The DB (module_workflow_registry) defines WHAT'S ACTIVE for a tenant.
 * The blueprint resolver joins both to produce EffectiveModuleView[].
 */

export interface ModuleUiRegistryEntry {
  moduleCode: string;
  moduleType: 'domain' | 'platform';
  icon: string;
  labelEn: string;
  labelAr: string;
  defaultLandingRoute: string;
  /** Permission prefix — matches module_workflow_registry.permission_prefix */
  permissionPrefix: string;
  dashboardPresets: string[];
  widgetFamilies: string[];
  color?: string;
  /** Categories this module maps to in the widget system */
  widgetCategory?: string;
}

/**
 * All modules that have UI presence.
 * Aligned with the 13 modules in migration 179 (module_workflow_registry)
 * plus platform modules (foundation, reporting, training, qiyas, ai, integrations, admin).
 */
export const MODULE_UI_REGISTRY: ModuleUiRegistryEntry[] = [
  // ── Core GRC ───────────────────────────────────────────────────────────
  {
    moduleCode: 'risk',
    moduleType: 'domain',
    icon: 'shield-alert',
    labelEn: 'Risk Management',
    labelAr: 'إدارة المخاطر',
    defaultLandingRoute: '/risk/home',
    permissionPrefix: 'risk',
    dashboardPresets: ['risk_ops'],
    widgetFamilies: ['risk'],
    color: '#e74c3c',
    widgetCategory: 'risk',
  },
  {
    moduleCode: 'compliance',
    moduleType: 'domain',
    icon: 'shield-check',
    labelEn: 'Compliance & Controls',
    labelAr: 'الامتثال والضوابط',
    defaultLandingRoute: '/compliance/overview',
    permissionPrefix: 'compliance',
    dashboardPresets: ['compliance_ops'],
    widgetFamilies: ['compliance'],
    color: '#2ecc71',
    widgetCategory: 'compliance',
  },
  {
    moduleCode: 'evidence',
    moduleType: 'domain',
    icon: 'folder-check',
    labelEn: 'Evidence Management',
    labelAr: 'إدارة الأدلة',
    defaultLandingRoute: '/evidence/overview',
    permissionPrefix: 'evidence',
    dashboardPresets: ['evidence_ops'],
    widgetFamilies: ['evidence'],
    color: '#3498db',
    widgetCategory: 'evidence',
  },
  {
    moduleCode: 'audit',
    moduleType: 'domain',
    icon: 'search-check',
    labelEn: 'Internal Audit',
    labelAr: 'التدقيق الداخلي',
    defaultLandingRoute: '/audit/overview',
    permissionPrefix: 'audit',
    dashboardPresets: ['audit_ops'],
    widgetFamilies: ['audit'],
    color: '#9b59b6',
    widgetCategory: 'audit',
  },
  {
    moduleCode: 'remediation',
    moduleType: 'domain',
    icon: 'wrench',
    labelEn: 'Remediation',
    labelAr: 'المعالجة',
    defaultLandingRoute: '/remediation',
    permissionPrefix: 'remediation',
    dashboardPresets: ['remediation_ops'],
    widgetFamilies: ['remediation'],
    color: '#e67e22',
  },
  {
    moduleCode: 'action',
    moduleType: 'domain',
    icon: 'check-circle',
    labelEn: 'Action Items',
    labelAr: 'بنود الإجراء',
    defaultLandingRoute: '/governance/actions',
    permissionPrefix: 'action',
    dashboardPresets: ['action_ops'],
    widgetFamilies: ['action'],
    color: '#1abc9c',
  },

  // ── Governance ─────────────────────────────────────────────────────────
  {
    moduleCode: 'governance',
    moduleType: 'domain',
    icon: 'building-2',
    labelEn: 'Governance Bodies',
    labelAr: 'هيئات الحوكمة',
    defaultLandingRoute: '/governance/overview',
    permissionPrefix: 'governance',
    dashboardPresets: ['governance_hub'],
    widgetFamilies: ['governance'],
    color: '#2c3e50',
    widgetCategory: 'governance',
  },
  {
    moduleCode: 'policy',
    moduleType: 'domain',
    icon: 'file-text',
    labelEn: 'Policy Management',
    labelAr: 'إدارة السياسات',
    defaultLandingRoute: '/governance/policies',
    permissionPrefix: 'policy',
    dashboardPresets: ['policy_ops'],
    widgetFamilies: ['governance'],
    color: '#34495e',
  },
  {
    moduleCode: 'exception',
    moduleType: 'domain',
    icon: 'alert-circle',
    labelEn: 'Exception Governance',
    labelAr: 'إدارة الاستثناءات',
    defaultLandingRoute: '/governance/exceptions',
    permissionPrefix: 'exception',
    dashboardPresets: ['exception_ops'],
    widgetFamilies: ['exception'],
    color: '#f39c12',
  },

  // ── Operational ────────────────────────────────────────────────────────
  {
    moduleCode: 'incident',
    moduleType: 'domain',
    icon: 'alert-triangle',
    labelEn: 'Incident Management',
    labelAr: 'إدارة الحوادث',
    defaultLandingRoute: '/incidents/overview',
    permissionPrefix: 'incident',
    dashboardPresets: ['incident_hub'],
    widgetFamilies: ['incidents'],
    color: '#e74c3c',
    widgetCategory: 'incidents',
  },
  {
    moduleCode: 'vendor',
    moduleType: 'domain',
    icon: 'truck',
    labelEn: 'Vendor Management',
    labelAr: 'إدارة الموردين',
    defaultLandingRoute: '/vendor-hub',
    permissionPrefix: 'vendor',
    dashboardPresets: ['vendor_hub'],
    widgetFamilies: ['vendors'],
    color: '#8e44ad',
    widgetCategory: 'vendors',
  },
  {
    moduleCode: 'bcp',
    moduleType: 'domain',
    icon: 'shield',
    labelEn: 'Business Continuity',
    labelAr: 'استمرارية الأعمال',
    defaultLandingRoute: '/bcp/overview',
    permissionPrefix: 'bcp',
    dashboardPresets: ['bcp_ops'],
    widgetFamilies: ['bcp'],
    color: '#16a085',
    widgetCategory: 'bcp',
  },
  {
    moduleCode: 'asset',
    moduleType: 'domain',
    icon: 'server',
    labelEn: 'Asset Management',
    labelAr: 'إدارة الأصول',
    defaultLandingRoute: '/assets',
    permissionPrefix: 'asset',
    dashboardPresets: ['asset_ops'],
    widgetFamilies: ['assets'],
    color: '#7f8c8d',
    widgetCategory: 'assets',
  },

  // ── Platform modules (not in module_workflow_registry but have UI) ────
  {
    moduleCode: 'foundation',
    moduleType: 'platform',
    icon: 'database',
    labelEn: 'Foundation',
    labelAr: 'الأساسيات',
    defaultLandingRoute: '/foundation/overview',
    permissionPrefix: 'foundation',
    dashboardPresets: ['foundation_ops'],
    widgetFamilies: ['platform'],
    color: '#95a5a6',
    widgetCategory: 'platform',
  },
  {
    moduleCode: 'reporting',
    moduleType: 'platform',
    icon: 'file-bar-chart',
    labelEn: 'Reports & Analytics',
    labelAr: 'التقارير والتحليلات',
    defaultLandingRoute: '/reports/overview',
    permissionPrefix: 'reporting',
    dashboardPresets: ['executive'],
    widgetFamilies: ['reporting'],
    color: '#2980b9',
    widgetCategory: 'reporting',
  },
  {
    moduleCode: 'training',
    moduleType: 'platform',
    icon: 'graduation-cap',
    labelEn: 'Training & Awareness',
    labelAr: 'التدريب والتوعية',
    defaultLandingRoute: '/training/overview',
    permissionPrefix: 'training',
    dashboardPresets: ['training_ops'],
    widgetFamilies: ['training'],
    color: '#27ae60',
  },
  {
    moduleCode: 'qiyas',
    moduleType: 'platform',
    icon: 'bar-chart-3',
    labelEn: 'Qiyas',
    labelAr: 'قياس',
    defaultLandingRoute: '/qiyas',
    permissionPrefix: 'qiyas',
    dashboardPresets: ['qiyas_ops'],
    widgetFamilies: ['qiyas'],
    color: '#d35400',
  },
  {
    moduleCode: 'ai',
    moduleType: 'platform',
    icon: 'cpu',
    labelEn: 'AI & Automation',
    labelAr: 'الذكاء الاصطناعي',
    defaultLandingRoute: '/ai-hub',
    permissionPrefix: 'ai',
    dashboardPresets: ['ai_suite'],
    widgetFamilies: ['ai'],
    color: '#8e44ad',
    widgetCategory: 'ai',
  },
  {
    moduleCode: 'workflow',
    moduleType: 'platform',
    icon: 'git-branch',
    labelEn: 'Workflow & Automation',
    labelAr: 'سير العمل والأتمتة',
    defaultLandingRoute: '/workflow-hub',
    permissionPrefix: 'workflow',
    dashboardPresets: ['workflow_ops'],
    widgetFamilies: ['workflow'],
    color: '#4338ca',
    widgetCategory: 'workflow',
  },
  {
    moduleCode: 'integrations',
    moduleType: 'platform',
    icon: 'plug-zap',
    labelEn: 'Integrations',
    labelAr: 'التكاملات',
    defaultLandingRoute: '/connector-hub',
    permissionPrefix: 'integrations',
    dashboardPresets: ['integration_ops'],
    widgetFamilies: ['integrations'],
    color: '#2c3e50',
  },
  {
    moduleCode: 'admin',
    moduleType: 'platform',
    icon: 'settings',
    labelEn: 'Administration',
    labelAr: 'الإدارة',
    defaultLandingRoute: '/admin-hub',
    permissionPrefix: 'admin',
    dashboardPresets: ['admin_ops'],
    widgetFamilies: ['admin'],
    color: '#7f8c8d',
  },

  // ── Notification ────────────────────────────────────────────────────
  {
    moduleCode: 'notification',
    moduleType: 'platform',
    icon: 'bell',
    labelEn: 'Notifications',
    labelAr: 'الإشعارات',
    defaultLandingRoute: '/notifications',
    permissionPrefix: 'notification',
    dashboardPresets: ['notification_ops'],
    widgetFamilies: ['notification'],
    color: '#e67e22',
  },

  // ── Analytics ──────────────────────────────────────────────────────
  {
    moduleCode: 'analytics',
    moduleType: 'platform',
    icon: 'bar-chart-2',
    labelEn: 'Analytics',
    labelAr: 'التحليلات',
    defaultLandingRoute: '/analytics',
    permissionPrefix: 'analytics',
    dashboardPresets: ['analytics_ops'],
    widgetFamilies: ['analytics'],
    color: '#2980b9',
  },

  // ── Team ───────────────────────────────────────────────────────────
  {
    moduleCode: 'team',
    moduleType: 'platform',
    icon: 'users',
    labelEn: 'Teams',
    labelAr: 'الفرق',
    defaultLandingRoute: '/teams',
    permissionPrefix: 'team',
    dashboardPresets: ['team_ops'],
    widgetFamilies: ['team'],
    color: '#16a085',
  },

  // ── DORA ──────────────────────────────────────────────────────────
  {
    moduleCode: 'dora',
    moduleType: 'domain',
    icon: 'shield-half',
    labelEn: 'DORA Resilience',
    labelAr: 'مرونة DORA',
    defaultLandingRoute: '/dora/overview',
    permissionPrefix: 'dora',
    dashboardPresets: ['dora_ops'],
    widgetFamilies: ['dora'],
    color: '#0891b2',
    widgetCategory: 'dora',
  },

  // ── Journey ────────────────────────────────────────────────────────
  {
    moduleCode: 'journey',
    moduleType: 'domain',
    icon: 'map',
    labelEn: 'GRC Maturity Journey',
    labelAr: 'رحلة نضج الحوكمة',
    defaultLandingRoute: '/journey/overview',
    permissionPrefix: 'journey',
    dashboardPresets: ['journey_ops'],
    widgetFamilies: ['journey'],
    color: '#059669',
    widgetCategory: 'journey',
  },

  // ── Privacy ──────────────────────────────────────────────────────
  {
    moduleCode: 'privacy',
    moduleType: 'domain',
    icon: 'lock',
    labelEn: 'Privacy Management',
    labelAr: 'إدارة الخصوصية',
    defaultLandingRoute: '/privacy/overview',
    permissionPrefix: 'privacy',
    dashboardPresets: ['privacy_ops'],
    widgetFamilies: ['privacy'],
    color: '#d12765',
    widgetCategory: 'privacy',
  },

  // ── Controls ─────────────────────────────────────────────────────
  {
    moduleCode: 'controls',
    moduleType: 'domain',
    icon: 'sliders-horizontal',
    labelEn: 'Controls',
    labelAr: 'الضوابط',
    defaultLandingRoute: '/controls/library',
    permissionPrefix: 'controls',
    dashboardPresets: ['controls_ops'],
    widgetFamilies: ['controls'],
    color: '#4338ca',
    widgetCategory: 'controls',
  },

  // ── Issues ───────────────────────────────────────────────────────
  {
    moduleCode: 'issues',
    moduleType: 'domain',
    icon: 'alert-octagon',
    labelEn: 'Issues',
    labelAr: 'المشكلات',
    defaultLandingRoute: '/issues/home',
    permissionPrefix: 'issues',
    dashboardPresets: ['issues_ops'],
    widgetFamilies: ['issues'],
    color: '#b91c1c',
  },

  // ── Inbox ────────────────────────────────────────────────────────
  {
    moduleCode: 'inbox',
    moduleType: 'platform',
    icon: 'inbox',
    labelEn: 'Inbox',
    labelAr: 'صندوق الوارد',
    defaultLandingRoute: '/inbox/home',
    permissionPrefix: 'inbox',
    dashboardPresets: ['inbox_ops'],
    widgetFamilies: ['inbox'],
    color: '#0369a1',
  },

  // ── Portals ──────────────────────────────────────────────────────
  {
    moduleCode: 'portals',
    moduleType: 'platform',
    icon: 'globe',
    labelEn: 'Portals',
    labelAr: 'البوابات',
    defaultLandingRoute: '/portals/home',
    permissionPrefix: 'portals',
    dashboardPresets: ['portals_ops'],
    widgetFamilies: ['portals'],
    color: '#6d28d9',
  },

  // ── Records ──────────────────────────────────────────────────────
  {
    moduleCode: 'records',
    moduleType: 'platform',
    icon: 'archive',
    labelEn: 'Records Management',
    labelAr: 'إدارة السجلات',
    defaultLandingRoute: '/records/home',
    permissionPrefix: 'records',
    dashboardPresets: ['records_ops'],
    widgetFamilies: ['records'],
    color: '#78716c',
  },

  // ── AI Governance (product module with lifecycle) ───────────────────
  {
    moduleCode: 'ai-governance',
    moduleType: 'domain',
    icon: 'brain-circuit',
    labelEn: 'AI Governance',
    labelAr: 'حوكمة الذكاء الاصطناعي',
    defaultLandingRoute: '/ai-governance/assets',
    permissionPrefix: 'ai-governance',
    dashboardPresets: ['ai_governance'],
    widgetFamilies: ['ai-governance'],
    color: '#6c3483',
    widgetCategory: 'ai-governance',
  },
];

/** Lookup by module code */
export const MODULE_UI_MAP = new Map(
  MODULE_UI_REGISTRY.map(m => [m.moduleCode, m])
);
