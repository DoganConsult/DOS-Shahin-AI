import { ModuleTabVM } from '@app/shared/models/module-overview.vm';
import { PageHeaderAction } from '@app/shared/components/layouts/page-header.component';

/**
 * Controls module side-nav tabs — follows the canonical Controls Module spec.
 *
 * 11 primary tabs:
 *   Home → My Work → Control Library → Mapping & Coverage → Testing →
 *   Certifications → Deficiencies → Continuous Monitoring → Reports → Admin
 *
 * 3 extra tabs (advanced analytics from existing compliance pages):
 *   Lifecycle (testing) → Posture (reports)
 */
export const CONTROLS_TABS: ModuleTabVM[] = [
  // ── Spec Primary (minimum) ──────────────────────────────────────────
  { id: 'home',            labelEn: 'Home',                    labelAr: 'الرئيسية',                route: '/controls/home',            icon: 'home' },
  { id: 'work-queue',      labelEn: 'My Work',                 labelAr: 'مهامي',                   route: '/controls/work-queue',      icon: 'inbox' },
  { id: 'library',         labelEn: 'Control Library',         labelAr: 'مكتبة الضوابط',           route: '/controls/library',         icon: 'shield' },
  { id: 'mapping',         labelEn: 'Mapping & Coverage',      labelAr: 'التغطية والربط',           route: '/controls/mapping',         icon: 'sitemap' },
  { id: 'testing',         labelEn: 'Testing & Executions',    labelAr: 'الاختبار والتنفيذ',        route: '/controls/testing',         icon: 'list-check' },
  { id: 'certifications',  labelEn: 'Certifications',          labelAr: 'الشهادات',                 route: '/controls/certifications',  icon: 'check-circle' },
  { id: 'deficiencies',    labelEn: 'Deficiencies',            labelAr: 'أوجه القصور',              route: '/controls/deficiencies',    icon: 'alert-triangle' },
  { id: 'monitoring',      labelEn: 'Continuous Monitoring',   labelAr: 'المراقبة المستمرة',        route: '/controls/monitoring',      icon: 'activity' },
  { id: 'reports',         labelEn: 'Reports',                 labelAr: 'التقارير',                 route: '/controls/reports',         icon: 'bar-chart-2' },
  { id: 'admin',           labelEn: 'Admin',                   labelAr: 'الإدارة',                  route: '/controls/admin',           icon: 'settings' },

  // ── Extras (advanced analytics) ─────────────────────────────────────
  { id: 'lifecycle',       labelEn: 'Lifecycle',               labelAr: 'دورة الحياة',             route: '/controls/lifecycle',       icon: 'refresh-cw',   parent: 'testing' },
  { id: 'posture',         labelEn: 'Control Posture',         labelAr: 'وضع الضوابط',             route: '/controls/posture',         icon: 'gauge',        parent: 'reports' },
];

/** Primary tabs only — used for main tab bar rendering */
export const CONTROLS_PRIMARY_TABS: ModuleTabVM[] = CONTROLS_TABS.filter(t => !t.parent);

/** Get extra (child) tabs for a given parent tab id */
export function getControlsSubTabs(parentId: string): ModuleTabVM[] {
  return CONTROLS_TABS.filter(t => t.parent === parentId);
}

export const CONTROLS_HEADER_ACTIONS: PageHeaderAction[] = [
  { id: 'export', labelEn: 'Export', labelAr: 'تصدير', icon: 'download' },
];

/** Control lifecycle states */
export const CONTROL_LIFECYCLE_STATES = [
  'draft', 'design', 'implementation', 'testing', 'effective', 'remediation', 'retired', 'exception_active',
] as const;
export type ControlLifecycleState = typeof CONTROL_LIFECYCLE_STATES[number];

/** Control types */
export const CONTROL_TYPES = ['preventive', 'detective', 'corrective', 'compensating'] as const;
export type ControlType = typeof CONTROL_TYPES[number];

/** Automation levels */
export const AUTOMATION_LEVELS = ['manual', 'semi_automated', 'automated'] as const;
export type AutomationLevel = typeof AUTOMATION_LEVELS[number];

/** Test methodologies */
export const TEST_METHODOLOGIES = ['inspection', 'observation', 'inquiry', 'reperformance', 'analytical', 'automated'] as const;
export type TestMethodology = typeof TEST_METHODOLOGIES[number];
