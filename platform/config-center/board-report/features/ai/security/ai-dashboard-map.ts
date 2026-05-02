import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const AI_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'ai',
  dashboardPresets: ['ai_suite'],
  widgetVisibility: {
    'ai.agent_status':          { visibleToRoles: ['owner','admin','tenant_admin','ai_admin','module_lead','auditor','viewer'] },
    'ai.recommendation_feed':   { visibleToRoles: ['owner','admin','tenant_admin','ai_admin','module_lead','auditor','viewer'] },
    'ai.automation_coverage':   { visibleToRoles: ['owner','admin','tenant_admin','ai_admin','module_lead','auditor','viewer'] },
  },
};
