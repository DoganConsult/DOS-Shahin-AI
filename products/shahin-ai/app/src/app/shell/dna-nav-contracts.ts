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
 * SINGLE-PIPELINE RULE: Shahin does not ship hardcoded Foundation nav.
 * Workspace navigation must resolve from the L1 API-backed Dynamic UI
 * pipeline (`/api/dynamic-ui/workspace/nav`) so the shell reflects the DB.
 */
export const SHAHIN_DNA_NAV_LOADERS: readonly DnaContractLoader[] = [];