import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const PRIVACY_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'privacy',
  dashboardPresets: ['privacy_suite'],
  widgetVisibility: {
    'privacy.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'privacy.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
