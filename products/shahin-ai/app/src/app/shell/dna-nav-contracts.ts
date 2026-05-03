import type { DnaContractLoader, DnaNavContract } from '@dos/access-store';

export type ShahinDnaModuleCode = 'foundation' | 'dauth' | 'dnoc' | 'dsoc' | 'dos' | 'ai';
export type ShahinDnaPageId = 'home' | 'register' | 'detail' | 'module-settings' | 'module-audit';

export interface ShahinDnaModulePack {
  moduleCode: ShahinDnaModuleCode;
  labelEn: string;
  labelAr: string;
  groupLabel: string;
  routeBase: string;
}

export interface ShahinDnaPageDef {
  id: ShahinDnaPageId;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
}

export const SHAHIN_DNA_MODULE_PACKS: readonly ShahinDnaModulePack[] = [
  { moduleCode: 'foundation', labelEn: 'Foundation',  labelAr: 'الأساسيات',     groupLabel: 'Foundation',   routeBase: '/foundation' },
  { moduleCode: 'dauth',     labelEn: 'DAuth',       labelAr: 'الهوية',         groupLabel: 'DAuth',        routeBase: '/dauth' },
  { moduleCode: 'dnoc',      labelEn: 'DNOC',        labelAr: 'المراقبة',       groupLabel: 'DNOC',         routeBase: '/dnoc' },
  { moduleCode: 'dsoc',      labelEn: 'DSOC',        labelAr: 'الأمن',          groupLabel: 'DSOC',         routeBase: '/dsoc' },
  { moduleCode: 'dos',       labelEn: 'DOS Platform',labelAr: 'منصة DOS',       groupLabel: 'DOS Platform', routeBase: '/dos' },
  { moduleCode: 'ai',        labelEn: 'AI Platform', labelAr: 'منصة الذكاء',    groupLabel: 'AI Platform',  routeBase: '/ai' },
] as const;

export const SHAHIN_DNA_PAGE_DEFS: readonly ShahinDnaPageDef[] = [
  {
    id: 'home',
    labelEn: 'Home',
    labelAr: 'الرئيسية',
    descriptionEn: 'Workspace landing surface for {module}.',
    descriptionAr: 'صفحة الانطلاق الخاصة بـ {module}.',
  },
  {
    id: 'register',
    labelEn: 'Register',
    labelAr: 'التسجيل',
    descriptionEn: 'Registration and enrollment workflows for {module}.',
    descriptionAr: 'عمليات التسجيل والتهيئة الخاصة بـ {module}.',
  },
  {
    id: 'detail',
    labelEn: 'Detail',
    labelAr: 'التفاصيل',
    descriptionEn: 'Operational detail surface for {module}.',
    descriptionAr: 'الواجهة التفصيلية التشغيلية الخاصة بـ {module}.',
  },
  {
    id: 'module-settings',
    labelEn: 'Settings',
    labelAr: 'الإعدادات',
    descriptionEn: 'Configuration and feature controls for {module}.',
    descriptionAr: 'الإعدادات والتحكم في الميزات الخاصة بـ {module}.',
  },
  {
    id: 'module-audit',
    labelEn: 'Audit',
    labelAr: 'التدقيق',
    descriptionEn: 'Audit trail and evidence checkpoints for {module}.',
    descriptionAr: 'سجل التدقيق ونقاط الإثبات الخاصة بـ {module}.',
  },
] as const;

export function findDnaModulePack(moduleCode: string): ShahinDnaModulePack | undefined {
  return SHAHIN_DNA_MODULE_PACKS.find((pack) => pack.moduleCode === moduleCode);
}

export function findDnaPageDef(pageId: string): ShahinDnaPageDef | undefined {
  return SHAHIN_DNA_PAGE_DEFS.find((page) => page.id === pageId);
}

export function buildDnaChildEntries(modulePack: ShahinDnaModulePack): Record<string, unknown> {
  const entries: Record<string, unknown> = {
    '': { redirectTo: 'home', pathMatch: 'full' },
  };

  for (const page of SHAHIN_DNA_PAGE_DEFS) {
    entries[page.id] = {
      loadComponent: () => import('../pages/dna/dna-page.component').then((m) => m.DnaPageComponent),
      data: {
        moduleCode: modulePack.moduleCode,
        moduleLabelEn: modulePack.labelEn,
        moduleLabelAr: modulePack.labelAr,
        pageId: page.id,
        pageLabelEn: page.labelEn,
        pageLabelAr: page.labelAr,
        descriptionEn: page.descriptionEn.replace('{module}', modulePack.labelEn),
        descriptionAr: page.descriptionAr.replace('{module}', modulePack.labelAr),
      },
    };
  }

  return entries;
}

// Generic 5-page stub nav contract for DNA modules (dauth/dnoc/dsoc/dos/ai).
function buildContract(modulePack: ShahinDnaModulePack): DnaNavContract {
  return {
    items: SHAHIN_DNA_PAGE_DEFS.map((page) => ({
      id: `${modulePack.moduleCode}.${page.id}`,
      label: page.labelEn,
      route: `${modulePack.routeBase}/${page.id}`,
      group: modulePack.groupLabel,
    })),
  };
}

/**
 * Foundation-specific nav contract — 17 real pages mounted in app.routes.ts
 * under path 'foundation'. Each maps to a real FoundationXxx component.
 * Route proof: app.routes.ts:87-145 (FoundationOverviewPageComponent, etc.).
 *
 * SINGLE-PIPELINE RULE: Foundation is the ONLY L2 DNA nav loader.
 * All other module nav (config-center, compliance, dauth, dnoc, dsoc, dos, ai,
 * access, runtime, ui-system, etc.) comes from L1 (dos.dynamic_ui_routes via
 * GET /api/dynamic-ui/workspace/nav). Foundation stays here because:
 *   1. Its health endpoint returns status:'up' (the only DNA module that does)
 *   2. It acts as a warm-start fallback before L1 responds on first navigation
 * To add nav items for ANY other module, update dos.dynamic_ui_routes + dos.navigation_registry.
 */
function buildFoundationContract(): DnaNavContract {
  return {
    items: [
      { id: 'foundation.overview',       label: 'Overview',       route: '/foundation/overview',          group: 'Foundation', order: 1 },
      { id: 'foundation.organization',   label: 'Organization',   route: '/foundation/organization',      group: 'Foundation', order: 2 },
      { id: 'foundation.business-units', label: 'Business Units', route: '/foundation/business-units',    group: 'Foundation', order: 3 },
      { id: 'foundation.departments',    label: 'Departments',    route: '/foundation/departments',       group: 'Foundation', order: 4 },
      { id: 'foundation.positions',      label: 'Positions',      route: '/foundation/positions',         group: 'Foundation', order: 5 },
      { id: 'foundation.locations',      label: 'Locations',      route: '/foundation/locations',         group: 'Foundation', order: 6 },
      { id: 'foundation.users',          label: 'Users',          route: '/foundation/users',             group: 'Foundation', order: 7 },
      { id: 'foundation.teams',          label: 'Teams',          route: '/foundation/teams',             group: 'Foundation', order: 8 },
      { id: 'foundation.roles',          label: 'Roles',          route: '/foundation/roles',             group: 'Foundation', order: 9 },
      { id: 'foundation.committees',     label: 'Committees',     route: '/foundation/committees',        group: 'Foundation', order: 10 },
      { id: 'foundation.delegations',    label: 'Delegations',    route: '/foundation/delegations',       group: 'Foundation', order: 11 },
      { id: 'foundation.ownership',      label: 'Ownership Map',  route: '/foundation/ownership-mapping', group: 'Foundation', order: 12 },
      { id: 'foundation.access-review',  label: 'Access Review',  route: '/foundation/access-review',     group: 'Foundation', order: 13 },
      { id: 'foundation.policies',       label: 'Policies',       route: '/foundation/policies',          group: 'Foundation', order: 14 },
      { id: 'foundation.reference-data', label: 'Reference Data', route: '/foundation/reference-data',    group: 'Foundation', order: 15 },
      { id: 'foundation.audit',          label: 'Audit Trail',    route: '/foundation/audit',             group: 'Foundation', order: 16 },
      { id: 'foundation.settings',       label: 'Settings',       route: '/foundation/settings',          group: 'Foundation', order: 17 },
    ],
  };
}

/**
 * SINGLE-PIPELINE RULE: Only Foundation is registered as an L2 nav loader.
 * All other modules use L1 (dos.dynamic_ui_routes).
 * To add or change nav items for any module, update the DB rows.
 */
export const SHAHIN_DNA_NAV_LOADERS: readonly DnaContractLoader[] = [
  { moduleCode: 'foundation', load: async () => buildFoundationContract() },
];