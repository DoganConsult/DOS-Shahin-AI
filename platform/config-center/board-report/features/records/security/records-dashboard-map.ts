import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const RECORDS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'records',
  dashboardPresets: ['records_ops'],
  widgetVisibility: {
    'records.total_count': { visibleToRoles: ['owner','admin','tenant_admin','records_manager','module_lead','auditor','viewer'] },
    'records.retention_compliance': { visibleToRoles: ['owner','admin','tenant_admin','records_manager','module_lead','auditor','viewer'] },
    'records.legal_hold_active': { visibleToRoles: ['owner','admin','tenant_admin','records_manager','module_lead','auditor'] },
    'records.disposal_pending': { visibleToRoles: ['owner','admin','tenant_admin','records_manager','module_lead','auditor'] },
  },
};
