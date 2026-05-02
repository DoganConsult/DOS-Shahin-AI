import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const JOURNEY_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'journey',
  dashboardPresets: ['journey_suite'],
  widgetVisibility: {
    'journey.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'journey.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
