import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const LOCAL_KNOWLEDGE_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'local-knowledge',
  dashboardPresets: ['localKnowledge_suite'],
  widgetVisibility: {
    'local-knowledge.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'local-knowledge.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
