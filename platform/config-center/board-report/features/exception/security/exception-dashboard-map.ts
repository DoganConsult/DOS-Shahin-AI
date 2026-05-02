import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const EXCEPTION_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'exception',
  dashboardPresets: ['exception_ops'],
  widgetVisibility: {
    'exception.active_count': { visibleToRoles: ['owner','admin','tenant_admin','exception_manager','module_lead','auditor','viewer'] },
    'exception.expiry_timeline': { visibleToRoles: ['owner','admin','tenant_admin','exception_manager','module_lead','auditor','viewer'] },
    'exception.risk_impact': { visibleToRoles: ['owner','admin','tenant_admin','exception_manager','module_lead','auditor','viewer'] },
  },
};
