import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const DASHBOARD_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'dashboard',
  dashboardPresets: ['dashboard_suite'],
  widgetVisibility: {
    'dashboard.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'dashboard.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
