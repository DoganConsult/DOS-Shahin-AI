import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const GOVERNANCE_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'governance',
  dashboardPresets: ['governance_hub'],
  widgetVisibility: {
    'governance.committee_calendar': { visibleToRoles: ['owner','admin','tenant_admin','governance_lead','module_lead','auditor','viewer'] },
    'governance.decision_tracker':   { visibleToRoles: ['owner','admin','tenant_admin','governance_lead','module_lead','auditor','viewer'] },
    'governance.board_pack_status':  { visibleToRoles: ['owner','admin','tenant_admin','governance_lead','module_lead','auditor','viewer'] },
    'governance.mandate_compliance': { visibleToRoles: ['owner','admin','tenant_admin','governance_lead','module_lead','auditor','viewer'] },
  },
};
