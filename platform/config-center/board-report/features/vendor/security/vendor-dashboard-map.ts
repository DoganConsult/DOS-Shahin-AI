import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const VENDOR_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'vendor',
  dashboardPresets: ['vendor_hub'],
  widgetVisibility: {
    'vendor.total_count':         { visibleToRoles: ['owner','admin','tenant_admin','vendor_manager','module_lead','auditor','viewer'] },
    'vendor.risk_distribution':   { visibleToRoles: ['owner','admin','tenant_admin','vendor_manager','module_lead','auditor','viewer'] },
    'vendor.assessment_due':      { visibleToRoles: ['owner','admin','tenant_admin','vendor_manager','module_lead','auditor','viewer'] },
    'vendor.sla_compliance':      { visibleToRoles: ['owner','admin','tenant_admin','vendor_manager','module_lead','auditor','viewer'] },
    'vendor.risk_heatmap':        { visibleToRoles: ['owner','admin','tenant_admin','vendor_manager','module_lead','auditor','viewer'] },
    'vendor.recent_assessments':  { visibleToRoles: ['owner','admin','tenant_admin','vendor_manager','module_lead','auditor','viewer'] },
  },
};
