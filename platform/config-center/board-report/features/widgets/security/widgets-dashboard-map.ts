import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const WIDGETS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'widgets',
  dashboardPresets: ['widgets_suite'],
  widgetVisibility: {
    'widgets.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'widgets.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
