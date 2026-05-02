import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const DORA_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'dora',
  dashboardPresets: ['dora_suite'],
  widgetVisibility: {
    'dora.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'dora.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
