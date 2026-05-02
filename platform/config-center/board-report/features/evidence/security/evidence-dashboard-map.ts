import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const EVIDENCE_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'evidence',
  dashboardPresets: ['evidence_ops'],
  widgetVisibility: {
    'evidence.freshness_gauge':      { visibleToRoles: ['owner','admin','tenant_admin','evidence_manager','module_lead','auditor','viewer'] },
    'evidence.overdue_queue':        { visibleToRoles: ['owner','admin','tenant_admin','evidence_manager','module_lead','auditor','viewer'] },
    'evidence.coverage_map':         { visibleToRoles: ['owner','admin','tenant_admin','evidence_manager','module_lead','auditor','viewer'] },
    'evidence.collection_timeline':  { visibleToRoles: ['owner','admin','tenant_admin','evidence_manager','module_lead','auditor','viewer'] },
  },
};
