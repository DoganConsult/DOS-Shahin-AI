import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const ONBOARDING_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'onboarding',
  dashboardPresets: ['onboarding_suite'],
  widgetVisibility: {
    'onboarding.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'onboarding.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
