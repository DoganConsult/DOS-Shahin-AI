import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const INCIDENT_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'incident',
  dashboardPresets: ['incident_hub'],
  widgetVisibility: {
    'incident.active_count':         { visibleToRoles: ['owner','admin','tenant_admin','incident_manager','module_lead','auditor','viewer'] },
    'incident.severity_distribution':{ visibleToRoles: ['owner','admin','tenant_admin','incident_manager','module_lead','auditor','viewer'] },
    'incident.response_time':        { visibleToRoles: ['owner','admin','tenant_admin','incident_manager','module_lead','auditor','viewer'] },
    'incident.trend_chart':          { visibleToRoles: ['owner','admin','tenant_admin','incident_manager','module_lead','auditor','viewer'] },
    'incident.recent_incidents':     { visibleToRoles: ['owner','admin','tenant_admin','incident_manager','module_lead','auditor','viewer'] },
    'incident.investigation_queue':  { visibleToRoles: ['owner','admin','tenant_admin','incident_manager','module_lead'] },
  },
};
