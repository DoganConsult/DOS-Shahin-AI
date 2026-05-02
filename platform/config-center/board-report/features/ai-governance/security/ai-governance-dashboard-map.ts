import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const AI_GOVERNANCE_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'ai-governance',
  dashboardPresets: ['ai_governance'],
  widgetVisibility: {
    'ai-governance.model_inventory':     { visibleToRoles: ['owner','admin','tenant_admin','ai_governance_lead','module_lead','auditor','viewer'] },
    'ai-governance.compliance_status':   { visibleToRoles: ['owner','admin','tenant_admin','ai_governance_lead','module_lead','auditor','viewer'] },
    'ai-governance.risk_alerts':         { visibleToRoles: ['owner','admin','tenant_admin','ai_governance_lead','module_lead','auditor','viewer'] },
    'ai-governance.enforcement_status':  { visibleToRoles: ['owner','admin','tenant_admin','ai_governance_lead','module_lead'] },
    'ai-governance.audit_trail':         { visibleToRoles: ['owner','admin','tenant_admin','ai_governance_lead','module_lead','auditor'] },
  },
};
