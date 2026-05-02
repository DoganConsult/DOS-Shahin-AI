import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const PORTALS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'portals',
  dashboardPresets: ['portals_ops'],
  widgetVisibility: {
    'portals.overview': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'portals.status_breakdown': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'portals.recent_activity': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
