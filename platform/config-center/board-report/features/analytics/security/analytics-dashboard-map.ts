import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const ANALYTICS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'analytics',
  dashboardPresets: ['analytics_ops'],
  widgetVisibility: {
    'analytics.kpi_summary': { visibleToRoles: ['owner','admin','tenant_admin','analytics_manager','module_lead','auditor','viewer'] },
    'analytics.trend_analysis': { visibleToRoles: ['owner','admin','tenant_admin','analytics_manager','module_lead','auditor','viewer'] },
    'analytics.data_freshness': { visibleToRoles: ['owner','admin','tenant_admin','analytics_manager','module_lead','auditor','viewer'] },
  },
};
