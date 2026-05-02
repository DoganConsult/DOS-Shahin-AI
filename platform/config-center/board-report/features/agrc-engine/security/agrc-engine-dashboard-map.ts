import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const AGRC_ENGINE_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'agrc-engine',
  dashboardPresets: ['agrcEngine_suite'],
  widgetVisibility: {
    'agrc-engine.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'agrc-engine.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
