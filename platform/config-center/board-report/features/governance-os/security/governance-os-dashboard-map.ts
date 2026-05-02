import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const GOVERNANCE_OS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'governance-os',
  dashboardPresets: ['governanceOs_suite'],
  widgetVisibility: {
    'governance-os.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'governance-os.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
