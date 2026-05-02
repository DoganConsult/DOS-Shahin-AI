import { ModuleDashboardMap } from '../../../shared/security/dashboard-map.types';

export const INBOX_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'inbox',
  dashboardPresets: ['inbox_ops'],
  widgetVisibility: {
    'inbox.overview': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'inbox.status_breakdown': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'inbox.recent_activity': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
