import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const CONTROLS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'controls',
  dashboardPresets: ['controls_ops'],
  widgetVisibility: {
    'controls.health_trend':       { visibleToRoles: ['owner', 'admin', 'tenant_admin', 'controls_manager', 'module_lead', 'auditor', 'viewer'] },
    'controls.failed_tests':       { visibleToRoles: ['owner', 'admin', 'tenant_admin', 'controls_manager', 'module_lead', 'auditor', 'viewer'] },
    'controls.overdue_tests':      { visibleToRoles: ['owner', 'admin', 'tenant_admin', 'controls_manager', 'module_lead', 'auditor', 'viewer'] },
    'controls.deficiencies':       { visibleToRoles: ['owner', 'admin', 'tenant_admin', 'controls_manager', 'module_lead', 'auditor', 'viewer'] },
    'controls.certifications_due': { visibleToRoles: ['owner', 'admin', 'tenant_admin', 'controls_manager', 'module_lead', 'auditor', 'viewer'] },
    'controls.automation_mix':     { visibleToRoles: ['owner', 'admin', 'tenant_admin', 'controls_manager', 'module_lead', 'auditor', 'viewer'] },
    'controls.coverage':           { visibleToRoles: ['owner', 'admin', 'tenant_admin', 'controls_manager', 'module_lead', 'auditor', 'viewer'] },
    'controls.monitoring_alerts':  { visibleToRoles: ['owner', 'admin', 'tenant_admin', 'controls_manager', 'module_lead', 'auditor', 'viewer'] },
  },
};
