import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const REMEDIATION_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'remediation',
  dashboardPresets: ['remediation_ops'],
  widgetVisibility: {
    'remediation.progress_tracker': { visibleToRoles: ['owner','admin','tenant_admin','remediation_lead','module_lead','auditor','viewer'] },
    'remediation.sla_status': { visibleToRoles: ['owner','admin','tenant_admin','remediation_lead','module_lead','auditor','viewer'] },
    'remediation.by_category': { visibleToRoles: ['owner','admin','tenant_admin','remediation_lead','module_lead','auditor','viewer'] },
  },
};
