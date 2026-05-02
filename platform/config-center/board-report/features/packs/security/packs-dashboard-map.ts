import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const PACKS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'packs',
  dashboardPresets: ['packs_suite'],
  widgetVisibility: {
    'packs.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'packs.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
