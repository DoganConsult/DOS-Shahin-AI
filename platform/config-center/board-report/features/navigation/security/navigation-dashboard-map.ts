import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const NAVIGATION_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'navigation',
  dashboardPresets: ['navigation_suite'],
  widgetVisibility: {
    'navigation.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'navigation.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
