import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const BCP_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'bcp',
  dashboardPresets: ['bcp_ops'],
  widgetVisibility: {
    'bcp.plan_status': { visibleToRoles: ['owner','admin','tenant_admin','bcp_manager','module_lead','auditor','viewer'] },
    'bcp.exercise_schedule': { visibleToRoles: ['owner','admin','tenant_admin','bcp_manager','module_lead','auditor','viewer'] },
    'bcp.recovery_metrics': { visibleToRoles: ['owner','admin','tenant_admin','bcp_manager','module_lead','auditor','viewer'] },
  },
};
