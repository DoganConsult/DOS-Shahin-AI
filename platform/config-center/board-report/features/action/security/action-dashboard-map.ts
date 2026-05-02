import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const ACTION_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'action',
  dashboardPresets: ['action_ops'],
  widgetVisibility: {
    'action.open_items': { visibleToRoles: ['owner','admin','tenant_admin','action_owner','module_lead','auditor','viewer'] },
    'action.completion_trend': { visibleToRoles: ['owner','admin','tenant_admin','action_owner','module_lead','auditor','viewer'] },
    'action.overdue_count': { visibleToRoles: ['owner','admin','tenant_admin','action_owner','module_lead','auditor','viewer'] },
  },
};
