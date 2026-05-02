import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const KSA_REGULATORY_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'ksa-regulatory',
  dashboardPresets: ['ksaRegulatory_suite'],
  widgetVisibility: {
    'ksa-regulatory.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'ksa-regulatory.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
