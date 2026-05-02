import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const ASSET_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'asset',
  dashboardPresets: ['asset_ops'],
  widgetVisibility: {
    'asset.inventory_summary': { visibleToRoles: ['owner','admin','tenant_admin','asset_manager','module_lead','auditor','viewer'] },
    'asset.classification_chart': { visibleToRoles: ['owner','admin','tenant_admin','asset_manager','module_lead','auditor','viewer'] },
    'asset.lifecycle_status': { visibleToRoles: ['owner','admin','tenant_admin','asset_manager','module_lead','auditor','viewer'] },
  },
};
