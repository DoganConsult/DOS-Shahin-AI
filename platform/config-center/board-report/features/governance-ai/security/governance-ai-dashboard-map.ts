import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const GOVERNANCE_AI_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'governance-ai',
  dashboardPresets: ['governance_ai_ops'],
  widgetVisibility: {
    'governance_ai.overview': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'governance_ai.status_breakdown': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'governance_ai.recent_activity': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
