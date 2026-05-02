import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const PROACTIVE_LEADERSHIP_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'proactive-leadership',
  dashboardPresets: ['proactiveLeadership_suite'],
  widgetVisibility: {
    'proactive-leadership.summary': { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
    'proactive-leadership.kpis':    { visibleToRoles: ['owner','admin','tenant_admin','module_lead','auditor','viewer'] },
  },
};
