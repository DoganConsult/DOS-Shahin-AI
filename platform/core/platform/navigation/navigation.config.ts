import { NavItem, QuickActionItem, ProductOwner } from './navigation.models';

// W9.D9.2 — Foundation children are now dynamically resolvable. The static
// list below remains as a hard fallback for offline/SSR/initial render. The
// canonical source is dos.dynamic_ui_navigation served by dynamic-ui-service.
// Use buildFoundationNavChildren(dynamic?) to merge live data when available.
export const STATIC_FOUNDATION_NAV_CHILDREN: NavItem[] = [
  { id: 'foundation-overview',        labelEn: 'Overview',          labelAr: 'نظرة عامة',         route: '/foundation/overview',          icon: 'home',     exact: true, module: 'foundation' },
  { id: 'foundation-organization',    labelEn: 'Organization',      labelAr: 'المنظمة',           route: '/foundation/organization',      icon: 'building-2', module: 'foundation' },
  { id: 'foundation-business-units',  labelEn: 'Business Units',    labelAr: 'وحدات الأعمال',    route: '/foundation/business-units',    icon: 'briefcase', module: 'foundation' },
  { id: 'foundation-departments',     labelEn: 'Departments',       labelAr: 'الأقسام',          route: '/foundation/departments',       icon: 'layers', module: 'foundation' },
  { id: 'foundation-users',           labelEn: 'Users',             labelAr: 'المستخدمون',       route: '/foundation/users',             icon: 'users', module: 'foundation' },
  { id: 'foundation-roles',           labelEn: 'Roles & Permissions', labelAr: 'الأدوار والصلاحيات', route: '/foundation/roles',         icon: 'key', module: 'foundation' },
  { id: 'foundation-teams',             labelEn: 'Teams',             labelAr: 'الفرق',            route: '/foundation/teams',             icon: 'users',        module: 'foundation' },
  { id: 'foundation-locations',       labelEn: 'Locations',         labelAr: 'المواقع',          route: '/foundation/locations',         icon: 'map-pin',      module: 'foundation' },
  { id: 'foundation-positions',       labelEn: 'Positions',         labelAr: 'المناصب',          route: '/foundation/positions',         icon: 'user-check',   module: 'foundation' },
  { id: 'foundation-committees',      labelEn: 'Committees',        labelAr: 'اللجان',           route: '/foundation/committees',        icon: 'table-2',      module: 'foundation' },
  { id: 'foundation-delegations',     labelEn: 'Delegations',       labelAr: 'التفويضات',       route: '/foundation/delegations',       icon: 'arrow-right-left', module: 'foundation' },
  { id: 'foundation-ownership-mapping', labelEn: 'Ownership Mapping', labelAr: 'خريطة الملكية',  route: '/foundation/ownership-mapping', icon: 'link',         module: 'foundation' },
  { id: 'foundation-access-review',   labelEn: 'Access Review',     labelAr: 'مراجعة الوصول',   route: '/foundation/access-review',     icon: 'shield',       module: 'foundation' },
  { id: 'foundation-policies',        labelEn: 'Policies',          labelAr: 'السياسات',         route: '/foundation/policies',          icon: 'file-text',    module: 'policy' },
  { id: 'foundation-data-processing', labelEn: 'Data Processing',   labelAr: 'معالجة البيانات', route: '/foundation/data-processing',   icon: 'cpu',          module: 'foundation' },
  { id: 'foundation-reference-data',  labelEn: 'Reference Data',    labelAr: 'البيانات المرجعية', route: '/foundation/reference-data',  icon: 'database',     module: 'foundation' },
  { id: 'foundation-approval-center', labelEn: 'Approval Center',   labelAr: 'مركز الموافقات',   route: '/approval-center',              icon: 'check-square', module: 'workflow' },
  { id: 'foundation-audit',           labelEn: 'Audit Log',         labelAr: 'سجل التدقيق',      route: '/foundation/audit',             icon: 'clock',        module: 'foundation' },
  { id: 'foundation-settings',        labelEn: 'Settings',          labelAr: 'الإعدادات',        route: '/foundation/settings',          icon: 'settings',     module: 'foundation' },
];

/**
 * Map a Dynamic UI navigation row (from /api/dynamic-ui/contract/foundation
 * or /api/dynamic-ui/navigation) onto the static SPA NavItem shape, preserving
 * the icon/labels/module attribution we know from STATIC_FOUNDATION_NAV_CHILDREN.
 */
export interface DynamicFoundationNavRow {
  module_code?: string;
  label?: string;
  route: string;
  sort_order?: number;
  readiness?: string | null;
}

const HIDDEN_DYNAMIC_READINESS = new Set(['STUB', 'BLOCKED']);

export function buildFoundationNavChildren(dynamic?: DynamicFoundationNavRow[]): NavItem[] {
  if (!dynamic || dynamic.length === 0) return [];
  const staticByRoute = new Map(STATIC_FOUNDATION_NAV_CHILDREN.map(c => [c.route!, c]));
  const merged: NavItem[] = [];
  for (const row of [...dynamic].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    if (HIDDEN_DYNAMIC_READINESS.has(String(row.readiness ?? '').toUpperCase())) continue;
    const fallback = staticByRoute.get(row.route);
    if (fallback) {
      merged.push({ ...fallback, labelEn: row.label || fallback.labelEn });
    } else {
      merged.push({
        id: row.route.replace(/^\//, '').replace(/\//g, '-'),
        labelEn: row.label || row.route,
        labelAr: row.label || row.route,
        route: row.route,
        icon: 'circle',
        module: (row.module_code as any) || 'foundation',
      });
    }
  }
  return merged.length ? merged : [];
}

export function buildFoundationGroup(children: NavItem[] = []): NavItem {
  return {
    id: 'foundation',
    labelEn: 'Foundation',
    labelAr: 'الأساسيات',
    icon: 'database',
    module: 'foundation',
    productOwner: 'platform',
    children,
  };
}

export function buildPlatformNav(dynamicFoundationChildren?: DynamicFoundationNavRow[]): NavItem[] {
  const foundationChildren = buildFoundationNavChildren(dynamicFoundationChildren);
  return [
    {
      id: 'home',
      labelEn: 'Home',
      labelAr: 'الرئيسية',
      route: '/workspace-home',
      icon: 'home',
      exact: true,
      productOwner: 'platform',
    },
    ...(foundationChildren.length ? [buildFoundationGroup(foundationChildren)] : []),
  ];
}

export const PLATFORM_NAV: NavItem[] = buildPlatformNav();

export const SHAHIN_NAV: NavItem[] = [
  // ── 2. Governance (shahin) ──────────────────────────────────────────────
  {
    id: 'governance',
    labelEn: 'Governance',
    labelAr: 'الحوكمة',
    icon: 'building-2',
    module: 'governance',
    productOwner: 'shahin',
    children: [
      { id: 'governance-overview',    labelEn: 'Overview',                labelAr: 'نظرة عامة',           route: '/governance/overview',    module: 'governance' },
      { id: 'governance-policies',    labelEn: 'Policies',                labelAr: 'السياسات',            route: '/governance/policies',    module: 'governance' },
      { id: 'governance-procedures',  labelEn: 'Procedures & Standards',  labelAr: 'الإجراءات والمعايير', route: '/governance/procedures',  module: 'governance' },
      { id: 'governance-committees',  labelEn: 'Committees',              labelAr: 'اللجان',              route: '/governance/committees',  module: 'governance' },
      { id: 'governance-decisions',   labelEn: 'Decisions',               labelAr: 'القرارات',            route: '/governance/decisions',   module: 'governance' },
      { id: 'governance-actions',            labelEn: 'Actions',                 labelAr: 'المهام',                  route: '/governance/actions',            module: 'governance' },
      { id: 'governance-exceptions',         labelEn: 'Exceptions',              labelAr: 'الاستثناءات',             route: '/governance/exceptions',         module: 'governance' },
      { id: 'governance-calendar',           labelEn: 'Calendar',                labelAr: 'التقويم',                 route: '/governance/calendar',           module: 'governance' },
      { id: 'governance-mandates',           labelEn: 'Mandates',                labelAr: 'التفويضات التنظيمية',     route: '/governance/mandates',           module: 'governance' },
      { id: 'governance-reviews',            labelEn: 'Reviews',                 labelAr: 'المراجعات',               route: '/governance/reviews',            module: 'governance' },
      { id: 'governance-acknowledgements',   labelEn: 'Acknowledgements',        labelAr: 'الإقرارات',               route: '/governance/acknowledgements',   module: 'governance' },
      { id: 'governance-objectives',         labelEn: 'Objectives',              labelAr: 'الأهداف',                 route: '/governance/objectives',         module: 'governance' },
      { id: 'governance-delegations',        labelEn: 'Delegations',             labelAr: 'التفويضات',               route: '/governance/delegations',        module: 'governance' },
      { id: 'governance-responsibilities',   labelEn: 'Responsibilities',        labelAr: 'المسؤوليات',              route: '/governance/responsibilities',   module: 'governance' },
      { id: 'governance-raci',               labelEn: 'RACI Templates',          labelAr: 'قوالب RACI',              route: '/governance/raci',               module: 'governance' },
      { id: 'governance-obligations',        labelEn: 'Obligations',             labelAr: 'الالتزامات',              route: '/governance/obligations',        module: 'governance' },
      { id: 'governance-charters',           labelEn: 'Charters',                labelAr: 'المواثيق',                route: '/governance/charters',           module: 'governance' },
      { id: 'governance-health',             labelEn: 'Health Score',            labelAr: 'مؤشر الصحة',              route: '/governance/health',             module: 'governance' },
      { id: 'governance-structure',          labelEn: 'Structure',               labelAr: 'الهيكل التنظيمي',         route: '/governance/structure',          module: 'governance' },
      { id: 'governance-board-packs',        labelEn: 'Board Packs',             labelAr: 'حزم مجلس الإدارة',        route: '/governance/board-packs',        module: 'governance' },
      { id: 'governance-exec-summaries',   labelEn: 'Executive Summaries',     labelAr: 'الملخصات التنفيذية',      route: '/governance/executive-summaries', module: 'governance' },
      { id: 'governance-initiatives',        labelEn: 'Initiatives',             labelAr: 'المبادرات',               route: '/governance/initiatives',         module: 'governance' },
      { id: 'governance-milestones',         labelEn: 'Milestones',              labelAr: 'المعالم',                 route: '/governance/milestones',          module: 'governance' },
      { id: 'governance-digests',            labelEn: 'Digests',                 labelAr: 'الملخصات',                route: '/governance/digests',             module: 'governance' },
      { id: 'governance-reports',          labelEn: 'Reports',                 labelAr: 'التقارير',                route: '/governance/reports',             module: 'governance' },
      { id: 'governance-admin',            labelEn: 'Admin',                   labelAr: 'الإدارة',                 route: '/governance/admin',               module: 'governance' },
    ],
  },

  // ── 3. Risk (shahin) ───────────────────────────────────────────────────
  {
    id: 'risk',
    labelEn: 'Risk',
    labelAr: 'المخاطر',
    icon: 'shield-alert',
    module: 'risk',
    productOwner: 'shahin',
    children: [
      // Spec primary (minimum)
      { id: 'risk-home',        labelEn: 'Home',             labelAr: 'الرئيسية',          route: '/risk/home',        module: 'risk' },
      { id: 'risk-work-queue',  labelEn: 'My Work',          labelAr: 'مهامي',             route: '/risk/work-queue',  module: 'risk' },
      { id: 'risk-register',    labelEn: 'Risk Register',    labelAr: 'سجل المخاطر',       route: '/risk/register',    module: 'risk' },
      { id: 'risk-assessments', labelEn: 'Assessments',      labelAr: 'التقييمات',          route: '/risk/assessments', module: 'risk' },
      { id: 'risk-indicators',  labelEn: 'Indicators',       labelAr: 'المؤشرات',          route: '/risk/indicators',  module: 'risk' },
      { id: 'risk-treatment',   labelEn: 'Treatment Plans',  labelAr: 'خطط المعالجة',      route: '/risk/treatment',   module: 'risk' },
      { id: 'risk-issues',      labelEn: 'Issues',           labelAr: 'القضايا',            route: '/risk/issues',      module: 'risk' },
      { id: 'risk-scenarios',   labelEn: 'Scenarios',        labelAr: 'السيناريوهات',       route: '/risk/scenarios',   module: 'risk' },
      { id: 'risk-reports',     labelEn: 'Reports',          labelAr: 'التقارير',           route: '/risk/reports',     module: 'risk' },
      { id: 'risk-admin',       labelEn: 'Admin',            labelAr: 'الإدارة',            route: '/risk/admin',       module: 'risk' },
      // Extras (advanced)
      { id: 'risk-scoring',     labelEn: 'Methodology',      labelAr: 'المنهجية',           route: '/risk/scoring',     module: 'risk' },
      { id: 'risk-acceptance',  labelEn: 'Risk Acceptance',  labelAr: 'قبول المخاطر',       route: '/risk/acceptance',  module: 'risk' },
      { id: 'risk-heatmap',     labelEn: 'Heatmap',          labelAr: 'الخريطة الحرارية',   route: '/risk/heatmap',     module: 'risk' },
      { id: 'risk-metrics',     labelEn: 'Metrics',          labelAr: 'المقاييس',           route: '/risk/metrics',     module: 'risk' },
      { id: 'risk-appetite',    labelEn: 'Risk Appetite',    labelAr: 'شهية المخاطر',       route: '/risk/appetite',    module: 'risk' },
      { id: 'risk-bowtie',      labelEn: 'Bow-Tie',          labelAr: 'ربطة القوس',         route: '/risk/bowtie',      module: 'risk' },
    ],
  },

  // ── 4. Compliance (shahin) ──────────────────────────────────────────────
  {
    id: 'compliance',
    labelEn: 'Compliance',
    labelAr: 'الامتثال',
    icon: 'shield-check',
    module: 'compliance',
    productOwner: 'shahin',
    children: [
      { id: 'compliance-overview',     labelEn: 'Overview',          labelAr: 'نظرة عامة',     route: '/compliance/overview',     module: 'compliance' },
      { id: 'compliance-frameworks',   labelEn: 'Frameworks',        labelAr: 'الأطر',          route: '/compliance/frameworks',   module: 'compliance' },
      { id: 'compliance-controls',     labelEn: 'Controls',          labelAr: 'الضوابط',       route: '/compliance/controls',     module: 'compliance' },
      { id: 'compliance-obligations',  labelEn: 'Obligations',       labelAr: 'الالتزامات',    route: '/compliance/obligations',  module: 'compliance' },
      { id: 'compliance-assessments',  labelEn: 'Assessments',       labelAr: 'التقييمات',     route: '/compliance/assessments',  module: 'compliance' },
      { id: 'compliance-gaps',         labelEn: 'Gaps',              labelAr: 'الفجوات',       route: '/compliance/gaps',         module: 'compliance' },
      { id: 'compliance-mappings',     labelEn: 'Mappings',          labelAr: 'الربط',          route: '/compliance/mappings',     module: 'compliance' },
      { id: 'compliance-posture',       labelEn: 'Posture Dashboard', labelAr: 'لوحة الوضع',    route: '/compliance/posture',       module: 'compliance' },
      { id: 'compliance-heatmap',       labelEn: 'Heat Map',          labelAr: 'خريطة الحرارة', route: '/compliance/heatmap',       module: 'compliance' },
      { id: 'compliance-attestations',  labelEn: 'Attestations',      labelAr: 'الإقرارات',     route: '/compliance/attestations',  module: 'compliance' },
      { id: 'compliance-exceptions',    labelEn: 'Exceptions',        labelAr: 'الاستثناءات',   route: '/compliance/exceptions',    module: 'compliance' },
      { id: 'compliance-roadmap',      labelEn: 'Roadmap',           labelAr: 'خارطة الطريق',  route: '/compliance/roadmap',      module: 'compliance' },
      { id: 'compliance-calendar',     labelEn: 'Calendar',          labelAr: 'التقويم',        route: '/compliance/calendar',     module: 'compliance' },
      { id: 'compliance-findings',     labelEn: 'Findings',          labelAr: 'النتائج',        route: '/compliance/findings',     module: 'compliance' },
      { id: 'compliance-templates',    labelEn: 'Templates',         labelAr: 'القوالب',        route: '/compliance/templates',    module: 'compliance' },
      { id: 'compliance-monitoring',   labelEn: 'Monitoring',        labelAr: 'المراقبة',       route: '/compliance/monitoring',   module: 'compliance' },
      { id: 'compliance-rcsa',         labelEn: 'RCSA',              labelAr: 'التقييم الذاتي', route: '/compliance/rcsa',         module: 'compliance' },
      { id: 'compliance-regulatory',   labelEn: 'Regulatory Changes',labelAr: 'التغييرات التنظيمية', route: '/compliance/regulatory-changes', module: 'compliance' },
      { id: 'compliance-reports',    labelEn: 'Reports',           labelAr: 'التقارير',            route: '/compliance/reports',            module: 'compliance' },
      { id: 'compliance-admin',      labelEn: 'Admin',             labelAr: 'الإدارة',             route: '/compliance/admin',              module: 'compliance' },
    ],
  },

  // ── 4b. Controls (shahin) ───────────────────────────────────────────────
  {
    id: 'controls',
    labelEn: 'Controls',
    labelAr: 'الضوابط',
    icon: 'verified',
    module: 'controls',
    productOwner: 'shahin',
    children: [
      { id: 'controls-home',           labelEn: 'Home',                labelAr: 'الرئيسية',             route: '/controls/home',           module: 'controls' },
      { id: 'controls-work-queue',     labelEn: 'My Work',             labelAr: 'مهامي',                route: '/controls/work-queue',     module: 'controls' },
      { id: 'controls-library',        labelEn: 'Control Library',     labelAr: 'مكتبة الضوابط',        route: '/controls/library',        module: 'controls' },
      { id: 'controls-mapping',        labelEn: 'Mapping & Coverage',  labelAr: 'التغطية والربط',        route: '/controls/mapping',        module: 'controls' },
      { id: 'controls-testing',        labelEn: 'Testing',             labelAr: 'الاختبار',              route: '/controls/testing',        module: 'controls' },
      { id: 'controls-certifications', labelEn: 'Certifications',      labelAr: 'الشهادات',              route: '/controls/certifications', module: 'controls' },
      { id: 'controls-deficiencies',   labelEn: 'Deficiencies',        labelAr: 'أوجه القصور',           route: '/controls/deficiencies',   module: 'controls' },
      { id: 'controls-monitoring',     labelEn: 'Monitoring',          labelAr: 'المراقبة المستمرة',     route: '/controls/monitoring',     module: 'controls' },
      { id: 'controls-reports',        labelEn: 'Reports',             labelAr: 'التقارير',              route: '/controls/reports',        module: 'controls' },
      { id: 'controls-admin',          labelEn: 'Admin',               labelAr: 'الإدارة',               route: '/controls/admin',          module: 'controls' },
    ],
  },

  // ── 5. Evidence ──────────────────────────────────────────────────────────
  {
    id: 'evidence',
    labelEn: 'Evidence',
    labelAr: 'الأدلة',
    icon: 'folder-check',
    module: 'evidence',
    productOwner: 'shahin',
    children: [
      { id: 'evidence-home',        labelEn: 'Home',                  labelAr: 'الرئيسية',            route: '/evidence/home',                  icon: 'home',         module: 'evidence' },
      { id: 'evidence-work-queue',   labelEn: 'My Work',              labelAr: 'مهامي',               route: '/evidence/work-queue',            icon: 'inbox',        module: 'evidence' },
      { id: 'evidence-catalog',     labelEn: 'Evidence Catalog',      labelAr: 'فهرس الأدلة',        route: '/evidence/catalog',               icon: 'list',         module: 'evidence' },
      { id: 'evidence-requests',    labelEn: 'Requests',              labelAr: 'الطلبات',             route: '/evidence/requests',              icon: 'mail',         module: 'evidence' },
      { id: 'evidence-reviews',     labelEn: 'Reviews & Quality',     labelAr: 'المراجعات والجودة',  route: '/evidence/reviews',               icon: 'check-circle', module: 'evidence' },
      { id: 'evidence-freshness',   labelEn: 'Freshness & Expiry',   labelAr: 'الصلاحية والانتهاء', route: '/evidence/freshness',             icon: 'clock',        module: 'evidence' },
      { id: 'evidence-reuse',       labelEn: 'Reuse & Linkage',      labelAr: 'إعادة الاستخدام',    route: '/evidence/reuse',                 icon: 'link-2',       module: 'evidence' },
      { id: 'evidence-packages',    labelEn: 'Packages & Exports',   labelAr: 'الحزم والتصدير',     route: '/evidence/packages',              icon: 'package',      module: 'evidence' },
      { id: 'evidence-connectors',  labelEn: 'Connectors',           labelAr: 'الموصلات',            route: '/evidence/connectors',            icon: 'plug',         module: 'evidence' },
      { id: 'evidence-reports',     labelEn: 'Reports',              labelAr: 'التقارير',            route: '/evidence/reports',               icon: 'bar-chart-2',  module: 'evidence' },
      { id: 'evidence-admin',       labelEn: 'Admin',                labelAr: 'الإدارة',             route: '/evidence/admin',                 icon: 'settings',     module: 'evidence' },
    ],
  },

  // ── 6. Audit (shahin) ──────────────────────────────────────────────────
  {
    id: 'audit',
    labelEn: 'Audit',
    labelAr: 'التدقيق',
    icon: 'search-check',
    module: 'audit',
    productOwner: 'shahin',
    children: [
      { id: 'audit-overview',     labelEn: 'Overview',      labelAr: 'نظرة عامة',         route: '/audit/overview',     module: 'audit' },
      { id: 'audit-plan',         labelEn: 'Audit Plan',    labelAr: 'خطة التدقيق',       route: '/audit/plan',         module: 'audit' },
      { id: 'audit-engagements',  labelEn: 'Audits',        labelAr: 'عمليات التدقيق',    route: '/audit/engagements',  module: 'audit' },
      { id: 'audit-findings',     labelEn: 'Findings',      labelAr: 'النتائج',            route: '/audit/findings',     module: 'audit' },
      { id: 'audit-capa',         labelEn: 'CAPA',          labelAr: 'الإجراءات التصحيحية', route: '/audit/capa',       module: 'audit' },
      { id: 'audit-validation',   labelEn: 'Validation',    labelAr: 'التحقق',             route: '/audit/validation',   module: 'audit' },
      { id: 'audit-reports',      labelEn: 'Reports',       labelAr: 'التقارير',           route: '/audit/reports',      module: 'audit' },
      { id: 'audit-admin',        labelEn: 'Admin',         labelAr: 'the',            route: '/audit/admin',        module: 'audit' },
    ],
  },

  // Local Knowledge (shahin) - Enterprise Knowledge Management & AI Retrieval
  {
    id: 'local-knowledge',
    labelEn: 'Local Knowledge',
    labelAr: 'Local Knowledge',
    icon: 'brain',
    module: 'local-knowledge',
    productOwner: 'shahin',
    children: [
      { id: 'local-knowledge-hub',        labelEn: 'Knowledge Hub',        labelAr: 'Knowledge Hub',        route: '/local-knowledge/hub',        module: 'local-knowledge' },
      { id: 'local-knowledge-ingestion',  labelEn: 'Document Ingestion',   labelAr: 'Document Ingestion',   route: '/local-knowledge/ingestion',  module: 'local-knowledge' },
      { id: 'local-knowledge-retrieval',  labelEn: 'Knowledge Retrieval',  labelAr: 'Knowledge Retrieval',  route: '/local-knowledge/retrieval',  module: 'local-knowledge' },
      { id: 'local-knowledge-curation',   labelEn: 'Content Curation',     labelAr: 'Content Curation',     route: '/local-knowledge/curation',   module: 'local-knowledge' },
      { id: 'local-knowledge-indexing',   labelEn: 'Index Management',     labelAr: 'Index Management',     route: '/local-knowledge/indexing',   module: 'local-knowledge' },
      { id: 'local-knowledge-sources',    labelEn: 'Knowledge Sources',    labelAr: 'Knowledge Sources',    route: '/local-knowledge/sources',    module: 'local-knowledge' },
      { id: 'local-knowledge-diagnostics', labelEn: 'Diagnostics',         labelAr: 'Diagnostics',         route: '/local-knowledge/diagnostics', module: 'local-knowledge' },
      { id: 'local-knowledge-admin',      labelEn: 'Administration',       labelAr: 'Administration',       route: '/local-knowledge/admin',      module: 'local-knowledge' },
    ],
  },

];

export const PLATFORM_NAV_BOTTOM: NavItem[] = [
  // ── 7. Reports (platform — core reporting engine; GRC-specific sub-items tagged) ──
  {
    id: 'reports',
    labelEn: 'Reports',
    labelAr: 'التقارير',
    icon: 'file-bar-chart',
    module: 'reporting',
    productOwner: 'platform',
    children: [
      { id: 'reports-overview',    labelEn: 'Reports Overview',      labelAr: 'نظرة عامة للتقارير',  route: '/reports/overview',    module: 'reporting' },
      { id: 'reports-executive',   labelEn: 'Executive Dashboard',   labelAr: 'لوحة تنفيذية',        route: '/reports/executive',   module: 'reporting' },
      { id: 'reports-risk',        labelEn: 'Risk Analytics',        labelAr: 'تحليلات المخاطر',      route: '/reports/risk',        module: 'reporting', productOwner: 'shahin' },
      { id: 'reports-compliance',  labelEn: 'Compliance Analytics',  labelAr: 'تحليلات الامتثال',     route: '/reports/compliance',  module: 'reporting', productOwner: 'shahin' },
      { id: 'reports-audit',       labelEn: 'Audit Analytics',       labelAr: 'تحليلات التدقيق',      route: '/reports/audit',       module: 'reporting', productOwner: 'shahin' },
      { id: 'reports-evidence',    labelEn: 'Evidence Analytics',    labelAr: 'تحليلات الأدلة',       route: '/reports/evidence',    module: 'reporting', productOwner: 'shahin' },
      { id: 'reports-scheduled',   labelEn: 'Scheduled Reports',     labelAr: 'التقارير المجدولة',    route: '/reports/scheduled',   module: 'reporting' },
      { id: 'reports-exports',     labelEn: 'Exports',               labelAr: 'التصدير',              route: '/reports/exports',     module: 'reporting' },
      { id: 'reports-builder',     labelEn: 'Report Builder',        labelAr: 'منشئ التقارير',        route: '/reports/builder',     module: 'reporting' },
    ],
  },

  // ── 8. Incidents (shahin) ────────────────────────────────────────────────
  {
    id: 'incidents',
    labelEn: 'Incidents',
    labelAr: 'الحوادث',
    icon: 'alert-triangle',
    module: 'incident',
    productOwner: 'shahin',
    children: [
      { id: 'incidents-overview',     labelEn: 'Overview',              labelAr: 'نظرة عامة',            route: '/incidents/overview',      module: 'incident' },
      { id: 'incidents-register',     labelEn: 'Incident Register',     labelAr: 'سجل الحوادث',          route: '/incidents/register',      module: 'incident' },
      { id: 'incidents-investigation',labelEn: 'Investigation',         labelAr: 'التحقيق',               route: '/incidents/investigation', module: 'incident' },
      { id: 'incidents-war-room',     labelEn: 'War Room',              labelAr: 'غرفة العمليات',        route: '/incidents/war-room',      module: 'incident' },
      { id: 'incidents-near-miss',    labelEn: 'Near-Miss',             labelAr: 'الحوادث الوشيكة',      route: '/incidents/near-miss',     module: 'incident' },
      { id: 'incidents-pir',          labelEn: 'Post-Incident Review',  labelAr: 'مراجعة ما بعد الحادث', route: '/incidents/pir',           module: 'incident' },
      { id: 'incidents-trends',       labelEn: 'Trends & Analytics',    labelAr: 'الاتجاهات والتحليلات', route: '/incidents/trends',        module: 'incident' },
      { id: 'incidents-regulatory',   labelEn: 'Regulatory Reporting',  labelAr: 'الإبلاغ التنظيمي',     route: '/incidents/regulatory',    module: 'incident' },
      { id: 'incidents-taxonomy',     labelEn: 'Taxonomy',              labelAr: 'التصنيف',               route: '/incidents/taxonomy',      module: 'incident' },
      { id: 'incidents-lessons',      labelEn: 'Lessons Learned',       labelAr: 'الدروس المستفادة',     route: '/incidents/lessons',       module: 'incident' },
      { id: 'incidents-triage',       labelEn: 'Triage Queue',          labelAr: 'قائمة الفرز',           route: '/incidents/triage',        module: 'incident' },
      { id: 'incidents-cases',        labelEn: 'Cases',                 labelAr: 'الحالات',               route: '/incidents/cases',         module: 'incident' },
      { id: 'incidents-breach',       labelEn: 'Breach Reporting',      labelAr: 'إبلاغ الاختراقات',     route: '/incidents/breach',        module: 'incident' },
      { id: 'incidents-impact',       labelEn: 'Impact & Timeline',     labelAr: 'الأثر والجدول الزمني', route: '/incidents/impact',        module: 'incident' },
      { id: 'incidents-evidence',     labelEn: 'Evidence',              labelAr: 'الأدلة',                route: '/incidents/evidence',      module: 'incident' },
      { id: 'incidents-capa',         labelEn: 'CAPA',                  labelAr: 'الإجراءات التصحيحية',  route: '/incidents/capa',          module: 'incident' },
      { id: 'incidents-reports',      labelEn: 'Reports',               labelAr: 'التقارير',              route: '/incidents/reports',       module: 'incident' },
      { id: 'incidents-admin',        labelEn: 'Admin',                 labelAr: 'الإدارة',               route: '/incidents/admin',         module: 'incident' },
    ],
  },

  // ── 9. Business Continuity (shahin) ─────────────────────────────────────
  {
    id: 'bcp',
    labelEn: 'Business Continuity',
    labelAr: 'استمرارية الأعمال',
    icon: 'shield',
    module: 'bcp',
    productOwner: 'shahin',
    children: [
      { id: 'bcp-overview',      labelEn: 'Overview',              labelAr: 'نظرة عامة',          route: '/bcp/overview',       module: 'bcp' },
      { id: 'bcp-plans',         labelEn: 'BCP Plans',             labelAr: 'خطط الاستمرارية',   route: '/bcp/plans',          module: 'bcp' },
      { id: 'bcp-bia',           labelEn: 'BIA Wizard',            labelAr: 'معالج تحليل الأثر', route: '/bcp/bia',            module: 'bcp' },
      { id: 'bcp-exercises',     labelEn: 'Exercises & DR Tests',  labelAr: 'التمارين والاختبارات', route: '/bcp/exercises',   module: 'bcp' },
      { id: 'bcp-crisis-comm',   labelEn: 'Crisis Communication',  labelAr: 'اتصالات الأزمات',   route: '/bcp/crisis-comm',    module: 'bcp' },
      { id: 'bcp-recovery',      labelEn: 'Recovery Strategies',   labelAr: 'استراتيجيات التعافي', route: '/bcp/recovery',     module: 'bcp' },
      { id: 'bcp-activation',    labelEn: 'Plan Activation',       labelAr: 'تفعيل الخطة',       route: '/bcp/activation',     module: 'bcp' },
      { id: 'bcp-dependencies',  labelEn: 'Dependency Maps',       labelAr: 'خرائط التبعية',     route: '/bcp/dependencies',   module: 'bcp' },
      { id: 'bcp-maturity',      labelEn: 'Maturity Assessment',   labelAr: 'تقييم النضج',       route: '/bcp/maturity',       module: 'bcp' },
      { id: 'bcp-crisis-room',   labelEn: 'Crisis Room',           labelAr: 'غرفة الأزمات',      route: '/bcp/crisis-room',    module: 'bcp' },
      { id: 'bcp-recovery-metrics', labelEn: 'Recovery Metrics',   labelAr: 'مقاييس التعافي',    route: '/bcp/recovery-metrics', module: 'bcp' },
      { id: 'bcp-findings',      labelEn: 'Findings & Improvements', labelAr: 'النتائج والتحسينات', route: '/bcp/findings',     module: 'bcp' },
      { id: 'bcp-reports',        labelEn: 'Reports',              labelAr: 'التقارير',           route: '/bcp/reports',        module: 'bcp' },
      { id: 'bcp-admin',          labelEn: 'Admin',                labelAr: 'الإدارة',            route: '/bcp/admin',          module: 'bcp' },
    ],
  },

  // ── 10. Vendor Risk (shahin) ────────────────────────────────────────────
  {
    id: 'vendor-risk',
    labelEn: 'Vendor Risk',
    labelAr: 'مخاطر الموردين',
    icon: 'truck',
    module: 'vendor',
    productOwner: 'shahin',
    children: [
      { id: 'vendor-home',           labelEn: 'Home',                  labelAr: 'الرئيسية',            route: '/vendor-risk/home',            module: 'vendor' },
      { id: 'vendor-overview',       labelEn: 'Overview',              labelAr: 'نظرة عامة',          route: '/vendor-hub',                 module: 'vendor' },
      { id: 'vendor-register',       labelEn: 'Vendor Register',       labelAr: 'سجل الموردين',       route: '/vendor-risk/register',       module: 'vendor' },
      { id: 'vendor-engagements',    labelEn: 'Engagements',           labelAr: 'الارتباطات',          route: '/vendor-risk/engagements',    module: 'vendor' },
      { id: 'vendor-assessments',    labelEn: 'Risk Assessments',      labelAr: 'تقييمات المخاطر',    route: '/vendor-risk/risk-assessments', module: 'vendor' },
      { id: 'vendor-due-diligence',  labelEn: 'Due Diligence',         labelAr: 'العناية الواجبة',    route: '/vendor-risk/due-diligence',  module: 'vendor' },
      { id: 'vendor-sla',            labelEn: 'SLA Monitoring',        labelAr: 'مراقبة الاتفاقيات', route: '/vendor-risk/sla',            module: 'vendor' },
      { id: 'vendor-fourth-party',   labelEn: 'Fourth-Party Risk',     labelAr: 'مخاطر الطرف الرابع', route: '/vendor-risk/fourth-party',  module: 'vendor' },
      { id: 'vendor-concentration',  labelEn: 'Concentration Risk',    labelAr: 'مخاطر التركز',       route: '/vendor-risk/concentration',  module: 'vendor' },
      { id: 'vendor-offboarding',    labelEn: 'Offboarding',           labelAr: 'إنهاء التعاقد',      route: '/vendor-risk/offboarding',    module: 'vendor' },
      { id: 'vendor-monitoring',     labelEn: 'Continuous Monitoring', labelAr: 'المراقبة المستمرة',  route: '/vendor-risk/monitoring',     module: 'vendor' },
      { id: 'vendor-issues',         labelEn: 'Issues & Exceptions',   labelAr: 'المشكلات والاستثناءات', route: '/vendor-risk/issues',      module: 'vendor' },
      { id: 'vendor-reports',        labelEn: 'Reports',               labelAr: 'التقارير',            route: '/vendor-risk/reports',        module: 'vendor' },
      { id: 'vendor-admin',          labelEn: 'Admin',                 labelAr: 'الإدارة',             route: '/vendor-risk/admin',          module: 'vendor' },
    ],
  },

  // ── 10b. Assets & IT (shahin) ───────────────────────────────────────────
  {
    id: 'asset',
    labelEn: 'Assets & IT',
    labelAr: 'الأصول وتقنية المعلومات',
    icon: 'server',
    module: 'asset',
    productOwner: 'shahin',
    children: [
      { id: 'asset-home',          labelEn: 'Overview',           labelAr: 'نظرة عامة',           route: '/asset/home',            module: 'asset' },
      { id: 'asset-register',      labelEn: 'Asset Register',     labelAr: 'سجل الأصول',          route: '/asset/register',        module: 'asset' },
      { id: 'asset-applications',  labelEn: 'Applications',       labelAr: 'التطبيقات',           route: '/asset/applications',    module: 'asset' },
      { id: 'asset-service-map',   labelEn: 'Service Map',        labelAr: 'خريطة الخدمات',       route: '/asset/service-map',     module: 'asset' },
      { id: 'asset-dependencies',  labelEn: 'Dependencies',       labelAr: 'التبعيات',            route: '/asset/dependencies',    module: 'asset' },
      { id: 'asset-critical',      labelEn: 'Critical Assets',    labelAr: 'الأصول الحرجة',       route: '/asset/critical-assets', module: 'asset' },
      { id: 'asset-ownership',     labelEn: 'Ownership',          labelAr: 'الملكية',             route: '/asset/ownership',       module: 'asset' },
      { id: 'asset-linkage',       labelEn: 'Linkage',            labelAr: 'الربط',               route: '/asset/linkage',         module: 'asset' },
      { id: 'asset-reports',       labelEn: 'Reports',            labelAr: 'التقارير',            route: '/asset/reports',         module: 'asset' },
      { id: 'asset-admin',         labelEn: 'Admin',              labelAr: 'الإدارة',             route: '/asset/admin',           module: 'asset' },
    ],
  },

  // ── 11. Training & Awareness (shahin) ──────────────────────────────────
  {
    id: 'training',
    labelEn: 'Training & Awareness',
    labelAr: 'التدريب والتوعية',
    icon: 'graduation-cap',
    module: 'training',
    productOwner: 'shahin',
    children: [
      { id: 'training-overview',       labelEn: 'Overview',           labelAr: 'نظرة عامة',          route: '/training/overview',       module: 'training' },
      { id: 'training-campaigns',      labelEn: 'Campaigns',          labelAr: 'الحملات',             route: '/training/campaigns',      module: 'training' },
      { id: 'training-assignments',    labelEn: 'Assignments',        labelAr: 'التكليفات',           route: '/training/assignments',    module: 'training' },
      { id: 'training-content',        labelEn: 'Content Library',    labelAr: 'مكتبة المحتوى',      route: '/training/content',        module: 'training' },
      { id: 'training-certifications', labelEn: 'Certifications',     labelAr: 'الشهادات',            route: '/training/certifications', module: 'training' },
      { id: 'training-phishing',       labelEn: 'Phishing Simulations', labelAr: 'محاكاة التصيد',     route: '/training/phishing',       module: 'training' },
      { id: 'training-compliance',     labelEn: 'Compliance Tracker', labelAr: 'متابعة الامتثال',    route: '/training/compliance',     module: 'training' },
      { id: 'training-reports',        labelEn: 'Reports',            labelAr: 'التقارير',            route: '/training/reports',        module: 'training' },
      { id: 'training-admin',          labelEn: 'Admin',              labelAr: 'الإدارة',             route: '/training/admin',          module: 'training' },
    ],
  },

  // ── Qiyas / Maturity (shahin) ───────────────────────────────────────────
  {
    id: 'qiyas',
    labelEn: 'Qiyas',
    labelAr: 'قياس',
    icon: 'bar-chart-3',
    module: 'qiyas',
    productOwner: 'shahin',
    children: [
      { id: 'qiyas-overview',     labelEn: 'Overview',        labelAr: 'نظرة عامة',    route: '/qiyas/overview',    module: 'qiyas' },
      { id: 'qiyas-dashboard',    labelEn: 'Dashboard',       labelAr: 'لوحة قياس',    route: '/qiyas',             module: 'qiyas' },
      { id: 'qiyas-assessments',  labelEn: 'Assessments',     labelAr: 'التقييمات',    route: '/qiyas/assessments', module: 'qiyas' },
      { id: 'qiyas-models',       labelEn: 'Models',          labelAr: 'النماذج',      route: '/qiyas/models',      module: 'qiyas' },
      { id: 'qiyas-maturity',     labelEn: 'Maturity Wizard', labelAr: 'معالج النضج',  route: '/maturity',          module: 'qiyas' },
      { id: 'qiyas-reports',      labelEn: 'Reports',         labelAr: 'التقارير',     route: '/qiyas/reports',     module: 'qiyas' },
      { id: 'qiyas-admin',        labelEn: 'Admin',           labelAr: 'الإدارة',      route: '/qiyas/admin',       module: 'qiyas' },
    ],
  },

  // ── AI & Automation (platform) ──────────────────────────────────────────
  {
    id: 'ai',
    labelEn: 'AI & Automation',
    labelAr: 'الذكاء الاصطناعي',
    icon: 'cpu',
    module: 'ai',
    productOwner: 'platform',
    children: [
      { id: 'ai-hub',        labelEn: 'AI Hub',     labelAr: 'مركز الذكاء',   route: '/ai-hub',    module: 'ai' },
      { id: 'ai-workflows',  labelEn: 'Workflows',  labelAr: 'سير العمل',     route: '/workflows', module: 'workflow' },
      { id: 'ai-task-board', labelEn: 'Task Board', labelAr: 'لوحة المهام',   route: '/task-board', module: 'ai' },
      { id: 'ai-agrc-os',    labelEn: 'AGRC-OS',    labelAr: 'نظام التشغيل',  route: '/agrc-os',   module: 'ai' },
      { id: 'ai-recommendation-inbox', labelEn: 'Recommendations', labelAr: 'التوصيات', route: '/ai-recommendation-inbox', module: 'ai' },
      { id: 'ai-decision-history',     labelEn: 'Decision History', labelAr: 'سجل القرارات', route: '/ai-decision-history', module: 'ai' },
      { id: 'ai-policy-rules',         labelEn: 'AI Policy Rules',  labelAr: 'قواعد سياسات الذكاء', route: '/ai-policy-rules', module: 'ai' },
      { id: 'ai-event-triggers',       labelEn: 'Event Triggers',   labelAr: 'مشغلات الأحداث',       route: '/ai-event-triggers', module: 'ai' },
      { id: 'ai-route-rules',          labelEn: 'Route Rules',      labelAr: 'قواعد التوجيه',        route: '/ai-route-rules', module: 'ai' },
      { id: 'ai-runtime-config',       labelEn: 'Runtime Config',   labelAr: 'تكوين التشغيل',        route: '/ai-runtime-config', module: 'ai' },
      { id: 'ai-cockpit',              labelEn: 'AI Cockpit',       labelAr: 'قمرة قيادة الذكاء',    route: '/ai-cockpit', module: 'ai' },
      { id: 'ai-settings',             labelEn: 'AI Settings',      labelAr: 'إعدادات الذكاء',       route: '/ai-settings', module: 'ai' },
    ],
  },

  // ── Exception Management (shahin) ─────────────────────────────────────
  {
    id: 'exception',
    labelEn: 'Exceptions',
    labelAr: 'الاستثناءات',
    icon: 'alert-octagon',
    module: 'exception',
    productOwner: 'shahin',
    children: [
      { id: 'exception-overview', labelEn: 'Overview',  labelAr: 'نظرة عامة',    route: '/exception/overview', module: 'exception' },
      { id: 'exception-register', labelEn: 'Register',  labelAr: 'السجل',        route: '/exception/register', module: 'exception' },
      { id: 'exception-reports',  labelEn: 'Reports',   labelAr: 'التقارير',     route: '/exception/reports',  module: 'exception' },
      { id: 'exception-admin',    labelEn: 'Admin',     labelAr: 'الإدارة',      route: '/exception/admin',    module: 'exception' },
    ],
  },

  // ── Remediation (shahin) ────────────────────────────────────────────────
  {
    id: 'remediation',
    labelEn: 'Remediation',
    labelAr: 'المعالجة',
    icon: 'wrench',
    module: 'remediation',
    productOwner: 'shahin',
    children: [
      { id: 'remediation-overview', labelEn: 'Overview',    labelAr: 'نظرة عامة',    route: '/remediation/overview', module: 'remediation' },
      { id: 'remediation-tasks',    labelEn: 'Tasks',       labelAr: 'المهام',       route: '/remediation/tasks',    module: 'remediation' },
      { id: 'remediation-reports',  labelEn: 'Reports',     labelAr: 'التقارير',     route: '/remediation/reports',  module: 'remediation' },
      { id: 'remediation-admin',    labelEn: 'Admin',       labelAr: 'الإدارة',      route: '/remediation/admin',    module: 'remediation' },
    ],
  },

  // ── Action Items (shahin) ───────────────────────────────────────────────
  {
    id: 'action',
    labelEn: 'Action Items',
    labelAr: 'بنود العمل',
    icon: 'check-square',
    module: 'action',
    productOwner: 'shahin',
    children: [
      { id: 'action-overview', labelEn: 'Overview',     labelAr: 'نظرة عامة',    route: '/action/overview', module: 'action' },
      { id: 'action-board',    labelEn: 'Action Board', labelAr: 'لوحة الإجراءات', route: '/action/board',  module: 'action' },
      { id: 'action-reports',  labelEn: 'Reports',      labelAr: 'التقارير',     route: '/action/reports',  module: 'action' },
      { id: 'action-admin',    labelEn: 'Admin',        labelAr: 'الإدارة',      route: '/action/admin',    module: 'action' },
    ],
  },

  // ── Issues (shahin) ─────────────────────────────────────────────────────
  {
    id: 'issues',
    labelEn: 'Issues',
    labelAr: 'المشكلات',
    icon: 'flag',
    module: 'issues',
    productOwner: 'shahin',
    children: [
      { id: 'issues-overview', labelEn: 'Overview',  labelAr: 'نظرة عامة',   route: '/issues/overview', module: 'issues' },
      { id: 'issues-register', labelEn: 'Register',  labelAr: 'السجل',       route: '/issues/register', module: 'issues' },
      { id: 'issues-reports',  labelEn: 'Reports',   labelAr: 'التقارير',    route: '/issues/reports',  module: 'issues' },
      { id: 'issues-admin',    labelEn: 'Admin',     labelAr: 'الإدارة',     route: '/issues/admin',    module: 'issues' },
    ],
  },

  // ── DORA (shahin) ───────────────────────────────────────────────────────
  {
    id: 'dora',
    labelEn: 'DORA',
    labelAr: 'قانون المرونة الرقمية',
    icon: 'shield-check',
    module: 'dora',
    productOwner: 'shahin',
    children: [
      { id: 'dora-overview',   labelEn: 'Overview',    labelAr: 'نظرة عامة',    route: '/dora/overview',   module: 'dora' },
      { id: 'dora-assessment', labelEn: 'Assessment',  labelAr: 'التقييم',      route: '/dora/assessment', module: 'dora' },
      { id: 'dora-reports',    labelEn: 'Reports',     labelAr: 'التقارير',     route: '/dora/reports',    module: 'dora' },
      { id: 'dora-admin',      labelEn: 'Admin',       labelAr: 'الإدارة',      route: '/dora/admin',      module: 'dora' },
    ],
  },

  // ── Privacy (shahin) ────────────────────────────────────────────────────
  {
    id: 'privacy',
    labelEn: 'Privacy',
    labelAr: 'الخصوصية',
    icon: 'lock',
    module: 'privacy',
    productOwner: 'shahin',
    children: [
      { id: 'privacy-overview',  labelEn: 'Overview',      labelAr: 'نظرة عامة',     route: '/privacy/overview',  module: 'privacy' },
      { id: 'privacy-register',  labelEn: 'Register',      labelAr: 'السجل',         route: '/privacy/register',  module: 'privacy' },
      { id: 'privacy-dpia',      labelEn: 'DPIA',          labelAr: 'تقييم الأثر',   route: '/privacy/dpia',      module: 'privacy' },
      { id: 'privacy-reports',   labelEn: 'Reports',       labelAr: 'التقارير',      route: '/privacy/reports',   module: 'privacy' },
      { id: 'privacy-admin',     labelEn: 'Admin',         labelAr: 'الإدارة',       route: '/privacy/admin',     module: 'privacy' },
    ],
  },

  // ── AI Governance (shahin) ──────────────────────────────────────────────
  {
    id: 'ai-governance',
    labelEn: 'AI Governance',
    labelAr: 'حوكمة الذكاء الاصطناعي',
    icon: 'brain',
    module: 'ai-governance',
    productOwner: 'shahin',
    children: [
      { id: 'ai-governance-overview',  labelEn: 'Overview',    labelAr: 'نظرة عامة',   route: '/ai-governance/overview',  module: 'ai-governance' },
      { id: 'ai-governance-models',    labelEn: 'Models',      labelAr: 'النماذج',     route: '/ai-governance/models',    module: 'ai-governance' },
      { id: 'ai-governance-risks',     labelEn: 'Risks',       labelAr: 'المخاطر',     route: '/ai-governance/risks',     module: 'ai-governance' },
      { id: 'ai-governance-reports',   labelEn: 'Reports',     labelAr: 'التقارير',    route: '/ai-governance/reports',   module: 'ai-governance' },
      { id: 'ai-governance-admin',     labelEn: 'Admin',       labelAr: 'الإدارة',     route: '/ai-governance/admin',     module: 'ai-governance' },
    ],
  },

  // ── Portals (domain) ────────────────────────────────────────────────────
  {
    id: 'portals',
    labelEn: 'Portals',
    labelAr: 'البوابات',
    icon: 'layout',
    module: 'portals',
    productOwner: 'shahin',
    children: [
      { id: 'portals-overview', labelEn: 'Overview',  labelAr: 'نظرة عامة',   route: '/portals/overview', module: 'portals' },
      { id: 'portals-manage',   labelEn: 'Manage',    labelAr: 'إدارة',       route: '/portals/manage',   module: 'portals' },
      { id: 'portals-reports',  labelEn: 'Reports',   labelAr: 'التقارير',    route: '/portals/reports',  module: 'portals' },
      { id: 'portals-admin',    labelEn: 'Admin',     labelAr: 'الإدارة',     route: '/portals/admin',    module: 'portals' },
    ],
  },

  // ── Records (domain) ────────────────────────────────────────────────────
  {
    id: 'records',
    labelEn: 'Records',
    labelAr: 'السجلات',
    icon: 'archive',
    module: 'records',
    productOwner: 'shahin',
    children: [
      { id: 'records-overview',  labelEn: 'Overview',   labelAr: 'نظرة عامة',   route: '/records/overview',  module: 'records' },
      { id: 'records-retention', labelEn: 'Retention',  labelAr: 'الاحتفاظ',    route: '/records/retention', module: 'records' },
      { id: 'records-reports',   labelEn: 'Reports',    labelAr: 'التقارير',    route: '/records/reports',   module: 'records' },
      { id: 'records-admin',     labelEn: 'Admin',      labelAr: 'الإدارة',     route: '/records/admin',     module: 'records' },
    ],
  },

  // ── Journey (domain) ────────────────────────────────────────────────────
  {
    id: 'journey',
    labelEn: 'Journey',
    labelAr: 'الرحلة',
    icon: 'map',
    module: 'journey',
    productOwner: 'shahin',
    children: [
      { id: 'journey-overview', labelEn: 'Overview',  labelAr: 'نظرة عامة',   route: '/journey/overview', module: 'journey' },
      { id: 'journey-map',     labelEn: 'Map',       labelAr: 'الخريطة',     route: '/journey/map',      module: 'journey' },
      { id: 'journey-reports',  labelEn: 'Reports',   labelAr: 'التقارير',    route: '/journey/reports',  module: 'journey' },
      { id: 'journey-admin',    labelEn: 'Admin',     labelAr: 'الإدارة',     route: '/journey/admin',    module: 'journey' },
    ],
  },

  // ── Integrations (platform) ─────────────────────────────────────────────
  {
    id: 'integrations',
    labelEn: 'Integrations',
    labelAr: 'التكاملات',
    icon: 'plug-zap',
    module: 'integrations',
    productOwner: 'platform',
    children: [
      { id: 'integrations-connector',    labelEn: 'Connector Hub',  labelAr: 'مركز الموصلات', route: '/connector-hub', module: 'integrations' },
      { id: 'integrations-marketplace',  labelEn: 'Marketplace',    labelAr: 'السوق',          route: '/integration-marketplace', module: 'integrations' },
    ],
  },

  // ── Notification (platform) ─────────────────────────────────────────────
  {
    id: 'notification',
    labelEn: 'Notifications',
    labelAr: 'الإشعارات',
    icon: 'bell',
    module: 'notification',
    productOwner: 'platform',
    children: [
      { id: 'notification-center', labelEn: 'Center',    labelAr: 'المركز',      route: '/notifications',         module: 'notification' },
      { id: 'notification-rules',  labelEn: 'Rules',     labelAr: 'القواعد',     route: '/notifications/rules',   module: 'notification' },
    ],
  },

  // ── Analytics (platform) ────────────────────────────────────────────────
  {
    id: 'analytics',
    labelEn: 'Analytics',
    labelAr: 'التحليلات',
    icon: 'trending-up',
    module: 'analytics',
    productOwner: 'platform',
    children: [
      { id: 'analytics-overview',   labelEn: 'Overview',    labelAr: 'نظرة عامة',   route: '/analytics/overview',   module: 'analytics' },
      { id: 'analytics-dashboards', labelEn: 'Dashboards',  labelAr: 'لوحات',       route: '/analytics/dashboards', module: 'analytics' },
    ],
  },

  // ── Team (platform) ─────────────────────────────────────────────────────
  {
    id: 'team',
    labelEn: 'Team',
    labelAr: 'الفريق',
    icon: 'users',
    module: 'team',
    productOwner: 'platform',
    children: [
      { id: 'team-hub',  labelEn: 'Team Hub',   labelAr: 'مركز الفريق',     route: '/team/hub',  module: 'team' },
    ],
  },

  // ── Inbox (platform) ────────────────────────────────────────────────────
  {
    id: 'inbox',
    labelEn: 'Inbox',
    labelAr: 'صندوق الوارد',
    icon: 'inbox',
    module: 'inbox',
    productOwner: 'platform',
    children: [
      { id: 'inbox-all',     labelEn: 'All Items',   labelAr: 'جميع العناصر', route: '/inbox',         module: 'inbox' },
      { id: 'inbox-tasks',   labelEn: 'Tasks',       labelAr: 'المهام',       route: '/inbox/tasks',   module: 'inbox' },
    ],
  },

  // ── Config Center (platform) ──────────────────────────────────────────
  {
    id: 'config-center',
    labelEn: 'Config Center',
    labelAr: 'مركز الإعدادات',
    icon: 'sliders',
    module: 'config-center',
    productOwner: 'platform',
    children: [
      { id: 'config-center-resolve',  labelEn: 'Resolve',   labelAr: 'حل الإعدادات',     route: '/config-center/resolve',  module: 'config-center' },
      { id: 'config-center-settings', labelEn: 'Settings',  labelAr: 'الإعدادات',         route: '/config-center/settings', module: 'config-center' },
      { id: 'config-center-audit',    labelEn: 'Audit',     labelAr: 'التدقيق',           route: '/config-center/audit',    module: 'config-center' },
      { id: 'config-center-health',   labelEn: 'Health',    labelAr: 'الصحة',             route: '/config-center/health',   module: 'config-center' },
      { id: 'config-center-compare',  labelEn: 'Compare',   labelAr: 'المقارنة',          route: '/config-center/compare',  module: 'config-center' },
      { id: 'config-center-gateway', labelEn: 'Gateway',   labelAr: 'بوابة الإعدادات',   route: '/config-center/gateway',  module: 'config-center' },
      { id: 'config-center-workspace', labelEn: 'Workspace', labelAr: 'مساحة العمل',       route: '/config-center/workspace', module: 'config-center' },
    ],
  },

  // ── Administration (platform) ───────────────────────────────────────────
  {
    id: 'admin',
    labelEn: 'Administration',
    labelAr: 'الإدارة',
    icon: 'settings',
    module: 'admin',
    productOwner: 'platform',
    children: [
      { id: 'admin-team',           labelEn: 'Team',               labelAr: 'الفريق',              route: '/team',                     module: 'admin' },
      { id: 'admin-hub',            labelEn: 'Admin Hub',          labelAr: 'مركز الإدارة',        route: '/admin-hub',                module: 'admin' },
      { id: 'admin-config',         labelEn: 'Configuration',      labelAr: 'التكوين',             route: '/tenant-config',            module: 'admin' },
      { id: 'admin-provisioning',   labelEn: 'Provisioning',       labelAr: 'التزويد',             route: '/admin/provisioning',       icon: 'play-circle', module: 'admin' },
      { id: 'admin-diagnostics',    labelEn: 'Diagnostics',        labelAr: 'التشخيصات',           route: '/admin/diagnostics',        icon: 'activity',    module: 'admin' },
      { id: 'admin-observability',  labelEn: 'Platform Health',    labelAr: 'صحة المنصة',          route: '/admin/observability',      icon: 'heart-pulse', module: 'admin' },
      { id: 'admin-modules',        labelEn: 'Module Registry',    labelAr: 'سجل الوحدات',         route: '/admin/modules',            icon: 'box',         module: 'admin' },
      { id: 'admin-products',       labelEn: 'Product Registry',   labelAr: 'سجل المنتجات',        route: '/admin/products',           icon: 'package',     module: 'admin' },
      { id: 'admin-feature-flags',  labelEn: 'Feature Flags',      labelAr: 'أعلام الميزات',       route: '/admin/feature-flags',      icon: 'flag',        module: 'admin' },
      { id: 'admin-event-bus',      labelEn: 'Event Bus',          labelAr: 'ناقل الأحداث',        route: '/admin/event-bus',          icon: 'zap',         module: 'admin' },
      { id: 'admin-dnoc-ai-ops',    labelEn: 'DNOC · AI Ops',     labelAr: 'عمليات الذكاء',       route: '/dnoc/ai-ops',              icon: 'activity',    module: 'admin' },
      { id: 'admin-dnoc-traces',    labelEn: 'DNOC · Trace Surfaces', labelAr: 'أسطح التتبع',     route: '/dnoc/ai-trace-surfaces',   icon: 'layers',      module: 'admin' },
      { id: 'admin-dsoc-security',  labelEn: 'DSOC · AI Security', labelAr: 'أمن الذكاء',         route: '/dsoc/ai-security',         icon: 'shield',      module: 'admin' },
    ],
  },
];

export const WIDGET_TO_QUICK_ACTION: Record<string, QuickActionItem> = {
  'risk-heatmap':      { id: 'qa-risk-heatmap',      labelEn: 'Open Risk Heatmap',         labelAr: 'فتح خريطة المخاطر',           route: '/risk/heatmap',       icon: 'shield-alert',    module: 'risk' },
  'overdue-actions':   { id: 'qa-governance-actions', labelEn: 'Review Overdue Actions',    labelAr: 'مراجعة الإجراءات المتأخرة',   route: '/governance/actions',  icon: 'clock-3',         module: 'governance' },
  'audit-exposure':    { id: 'qa-audit-findings',     labelEn: 'Review Audit Findings',     labelAr: 'مراجعة نتائج التدقيق',        route: '/audit/findings',     icon: 'search-check',    module: 'audit' },
  'executive-summary': { id: 'qa-executive',          labelEn: 'Open Executive Summary',    labelAr: 'فتح الملخص التنفيذي',          route: '/reports/executive',  icon: 'layout-dashboard', module: 'reporting' },
  'privacy-incidents': { id: 'qa-privacy',            labelEn: 'Open Privacy Overview',     labelAr: 'فتح لوحة الخصوصية',           route: '/privacy-hub',        icon: 'lock',            module: 'incident' },
  'maturity-score':    { id: 'qa-qiyas',              labelEn: 'Open Qiyas Overview',       labelAr: 'فتح لوحة قياس',               route: '/qiyas',              icon: 'bar-chart-3',     module: 'qiyas' },
};
