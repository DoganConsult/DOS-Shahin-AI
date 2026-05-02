import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const ISSUES_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'issues',
  dashboardPresets: ['issues_ops'],
  widgetVisibility: {
    'issues.overview': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'issues.status_breakdown': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'issues.recent_activity': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
