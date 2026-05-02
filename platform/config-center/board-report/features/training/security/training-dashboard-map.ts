import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const TRAINING_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'training',
  dashboardPresets: ['training_ops'],
  widgetVisibility: {
    'training.completion_rate': { visibleToRoles: ['owner','admin','tenant_admin','training_manager','module_lead','auditor','viewer'] },
    'training.upcoming_assignments': { visibleToRoles: ['owner','admin','tenant_admin','training_manager','module_lead','auditor','viewer'] },
    'training.certification_status': { visibleToRoles: ['owner','admin','tenant_admin','training_manager','module_lead','auditor','viewer'] },
  },
};
