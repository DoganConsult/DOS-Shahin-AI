import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const INTEGRATIONS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'integrations',
  dashboardPresets: ['integration_ops'],
  widgetVisibility: {
    'integration.connector_health': { visibleToRoles: ['owner','admin','tenant_admin','integration_admin','module_lead','auditor','viewer'] },
    'integration.sync_status': { visibleToRoles: ['owner','admin','tenant_admin','integration_admin','module_lead','auditor','viewer'] },
    'integration.error_rate': { visibleToRoles: ['owner','admin','tenant_admin','integration_admin','module_lead','auditor','viewer'] },
  },
};
