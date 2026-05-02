import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const POLICY_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'policy',
  dashboardPresets: ['policy_ops'],
  widgetVisibility: {
    'policy.lifecycle_status': { visibleToRoles: ['owner','admin','tenant_admin','policy_manager','module_lead','auditor','viewer'] },
    'policy.review_schedule': { visibleToRoles: ['owner','admin','tenant_admin','policy_manager','module_lead','auditor','viewer'] },
    'policy.attestation_progress': { visibleToRoles: ['owner','admin','tenant_admin','policy_manager','module_lead','auditor','viewer'] },
  },
};
