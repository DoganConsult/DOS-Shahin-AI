import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const BOOTSTRAP_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'bootstrap',
  dashboardPresets: ['bootstrap_suite'],
  widgetVisibility: {
    'bootstrap.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'bootstrap.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
