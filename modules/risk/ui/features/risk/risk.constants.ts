import { ModuleTabVM } from '@app/shared/models/module-overview.vm';
import { PageHeaderAction } from '@app/shared/components/layouts/page-header.component';

/**
 * Risk module side-nav tabs — follows the canonical Risk Module spec.
 *
 * 10 primary tabs (spec minimum):
 *   Home → My Work → Risk Register → Assessments → Indicators →
 *   Treatment Plans → Issues → Scenarios → Reports → Admin
 *
 * 6 extra tabs (advanced capabilities grouped under parent sections):
 *   Scoring (assessments) → Acceptance (treatment) → Heatmap (reports) →
 *   Metrics (reports) → Appetite (admin) → Bow-Tie (scenarios)
 */
export const RISK_TABS: ModuleTabVM[] = [
  // ── Spec Primary (minimum) ──────────────────────────────────────────
  { id: 'home',        labelEn: 'Home',             labelAr: 'الرئيسية',          route: '/risk/home',        icon: 'home' },
  { id: 'work-queue',  labelEn: 'My Work',          labelAr: 'مهامي',             route: '/risk/work-queue',  icon: 'inbox' },
  { id: 'register',    labelEn: 'Risk Register',    labelAr: 'سجل المخاطر',       route: '/risk/register',    icon: 'shield' },
  { id: 'assessments', labelEn: 'Assessments',      labelAr: 'التقييمات',          route: '/risk/assessments', icon: 'list-check' },
  { id: 'indicators',  labelEn: 'Indicators',       labelAr: 'المؤشرات',          route: '/risk/indicators',  icon: 'arrow-up-right' },
  { id: 'treatment',   labelEn: 'Treatment Plans',  labelAr: 'خطط المعالجة',      route: '/risk/treatment',   icon: 'wrench' },
  { id: 'issues',      labelEn: 'Issues',           labelAr: 'القضايا',            route: '/risk/issues',      icon: 'alert-triangle' },
  { id: 'scenarios',   labelEn: 'Scenarios',        labelAr: 'السيناريوهات',       route: '/risk/scenarios',   icon: 'sitemap' },
  { id: 'reports',     labelEn: 'Reports',          labelAr: 'التقارير',           route: '/risk/reports',     icon: 'bar-chart-2' },
  { id: 'admin',       labelEn: 'Admin',            labelAr: 'الإدارة',            route: '/risk/admin',       icon: 'settings' },

  // ── Extras (advanced) ───────────────────────────────────────────────
  { id: 'scoring',     labelEn: 'Methodology',      labelAr: 'المنهجية',           route: '/risk/scoring',     icon: 'sliders-h',    parent: 'assessments' },
  { id: 'acceptance',  labelEn: 'Risk Acceptance',  labelAr: 'قبول المخاطر',       route: '/risk/acceptance',  icon: 'check-circle', parent: 'treatment' },
  { id: 'heatmap',     labelEn: 'Heatmap',          labelAr: 'الخريطة الحرارية',   route: '/risk/heatmap',     icon: 'chart-bar',    parent: 'reports' },
  { id: 'metrics',     labelEn: 'Metrics',          labelAr: 'المقاييس',           route: '/risk/metrics',     icon: 'gauge',        parent: 'reports' },
  { id: 'appetite',    labelEn: 'Risk Appetite',    labelAr: 'شهية المخاطر',       route: '/risk/appetite',    icon: 'bullseye',     parent: 'admin' },
  { id: 'bowtie',      labelEn: 'Bow-Tie',          labelAr: 'ربطة القوس',         route: '/risk/bowtie',      icon: 'share-alt',    parent: 'scenarios' },
];

/** Primary tabs only (spec minimum) — used for main tab bar rendering */
export const RISK_PRIMARY_TABS: ModuleTabVM[] = RISK_TABS.filter(t => !t.parent);

/** Get extra (child) tabs for a given parent tab id */
export function getRiskSubTabs(parentId: string): ModuleTabVM[] {
  return RISK_TABS.filter(t => t.parent === parentId);
}

export const RISK_HEADER_ACTIONS: PageHeaderAction[] = [
  { id: 'export', labelEn: 'Export', labelAr: 'تصدير', icon: 'download' },
];
