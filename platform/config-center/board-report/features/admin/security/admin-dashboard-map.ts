import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const ADMIN_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'admin',
  dashboardPresets: ['admin_ops'],
  widgetVisibility: {
    'admin.user_activity': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'admin.module_health': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'admin.license_usage': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
