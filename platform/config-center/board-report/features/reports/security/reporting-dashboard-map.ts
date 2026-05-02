import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const REPORTING_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'reporting',
  dashboardPresets: ['executive'],
  widgetVisibility: {
    'executive.compliance_score':   { visibleToRoles: ['owner','admin','tenant_admin','report_manager','module_lead','auditor','viewer'] },
    'executive.risk_posture':       { visibleToRoles: ['owner','admin','tenant_admin','report_manager','module_lead','auditor','viewer'] },
    'executive.audit_readiness':    { visibleToRoles: ['owner','admin','tenant_admin','report_manager','module_lead','auditor','viewer'] },
    'executive.evidence_freshness': { visibleToRoles: ['owner','admin','tenant_admin','report_manager','module_lead','auditor','viewer'] },
  },
};
