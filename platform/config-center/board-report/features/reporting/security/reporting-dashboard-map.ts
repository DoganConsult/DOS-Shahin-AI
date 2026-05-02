import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const REPORTING_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'reporting',
  dashboardPresets: ['reporting_suite'],
  widgetVisibility: {
    'reporting.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'reporting.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
