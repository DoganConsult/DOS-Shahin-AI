/**
 * Config-driven module list for dashboard grid.
 * Single source of truth: id, icon, i18n keys, route.
 */

export interface DashboardModuleItem {
  id: string;
  /** PrimeIcons name without 'pi-' prefix (e.g. 'sitemap', 'exclamation-triangle') */
  icon: string;
  iconVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
  /** i18n key for title */
  titleKey: string;
  /** i18n key for subtitle (optional) */
  subtitleKey?: string;
  route: string;
  /** Optional permission to show (e.g. 'compliance.program.read'); if not set, always show */
  permission?: string;
  /** Module code for tenant-level visibility filtering */
  moduleCode?: string;
}

export const DASHBOARD_MODULES: DashboardModuleItem[] = [
  { id: 'foundation',   icon: 'database',       titleKey: 'nav.foundation',   subtitleKey: 'modules.foundation.subtitle',   route: '/foundation/overview', iconVariant: 'primary', moduleCode: 'foundation' },
  { id: 'frameworks',   icon: 'sitemap',        titleKey: 'nav.frameworks',   subtitleKey: 'modules.frameworks.subtitle',   route: '/frameworks',   iconVariant: 'primary',  moduleCode: 'compliance' },
  { id: 'compliance',   icon: 'check-square',   titleKey: 'nav.compliance',   subtitleKey: 'modules.compliance.subtitle',   route: '/compliance',   iconVariant: 'success',  moduleCode: 'compliance' },
  { id: 'controls',    icon: 'lock',            titleKey: 'nav.controls',    subtitleKey: 'modules.controls.subtitle',    route: '/controls',    iconVariant: 'primary',   moduleCode: 'controls' },
  { id: 'risks',       icon: 'exclamation-triangle', titleKey: 'nav.risks', subtitleKey: 'modules.risks.subtitle',       route: '/risk/home',  iconVariant: 'warning',    moduleCode: 'risk' },
  { id: 'policies',    icon: 'file',            titleKey: 'nav.policies',    subtitleKey: 'modules.policies.subtitle',    route: '/policies',    iconVariant: 'purple',    moduleCode: 'policy' },
  { id: 'evidence',    icon: 'file-check',      titleKey: 'nav.evidence',    subtitleKey: 'modules.evidence.subtitle',    route: '/evidence',    iconVariant: 'success',   moduleCode: 'evidence' },
  { id: 'audit',       icon: 'shield',          titleKey: 'nav.audit',       subtitleKey: 'modules.audit.subtitle',       route: '/audit',       iconVariant: 'primary',   moduleCode: 'audit' },
  { id: 'governance',  icon: 'briefcase',       titleKey: 'nav.governance',   subtitleKey: 'modules.governance.subtitle',   route: '/governance',  iconVariant: 'primary',  moduleCode: 'governance' },
];
