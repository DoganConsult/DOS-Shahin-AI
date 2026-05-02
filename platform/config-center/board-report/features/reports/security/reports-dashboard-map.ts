import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const REPORTS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'reports',
  dashboardPresets: ['reports_suite'],
  widgetVisibility: {
    'reports.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'reports.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
