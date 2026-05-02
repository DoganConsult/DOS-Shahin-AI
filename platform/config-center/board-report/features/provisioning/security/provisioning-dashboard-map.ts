import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const PROVISIONING_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'provisioning',
  dashboardPresets: ['provisioning_suite'],
  widgetVisibility: {
    'provisioning.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'provisioning.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
