import { ModuleDashboardMap } from '@app/shared/security/dashboard-map.types';

export const NOTIFICATION_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'notification',
  dashboardPresets: ['notification_ops'],
  widgetVisibility: {
    'notification.delivery_rate': { visibleToRoles: ['owner','admin','tenant_admin','notification_admin','module_lead','auditor','viewer'] },
    'notification.channel_health': { visibleToRoles: ['owner','admin','tenant_admin','notification_admin','module_lead','auditor','viewer'] },
    'notification.pending_queue': { visibleToRoles: ['owner','admin','tenant_admin','notification_admin','module_lead','auditor','viewer'] },
  },
};
