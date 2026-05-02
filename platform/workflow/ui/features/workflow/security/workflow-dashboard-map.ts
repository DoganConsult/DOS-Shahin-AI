import { ModuleDashboardMap } from '../../../shared/security/dashboard-map.types';

export const WORKFLOW_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'workflow',
  dashboardPresets: ['workflow_ops'],
  widgetVisibility: {
    'workflow.active_instances': { visibleToRoles: ['owner','admin','tenant_admin','workflow_admin','module_lead','auditor','viewer'] },
    'workflow.sla_compliance': { visibleToRoles: ['owner','admin','tenant_admin','workflow_admin','module_lead','auditor','viewer'] },
    'workflow.bottleneck_analysis': { visibleToRoles: ['owner','admin','tenant_admin','workflow_admin','module_lead','auditor','viewer'] },
  },
};
