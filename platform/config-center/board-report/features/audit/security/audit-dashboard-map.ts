import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const AUDIT_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'audit',
  dashboardPresets: ['audit_ops'],
  widgetVisibility: {
    'audit.findings_by_severity': { visibleToRoles: ['owner','admin','tenant_admin','audit_lead','module_lead','auditor','viewer'] },
    'audit.capa_progress':        { visibleToRoles: ['owner','admin','tenant_admin','audit_lead','module_lead','auditor','viewer'] },
    'audit.engagement_timeline':  { visibleToRoles: ['owner','admin','tenant_admin','audit_lead','module_lead','auditor','viewer'] },
  },
};
