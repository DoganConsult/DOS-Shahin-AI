import { ModuleDashboardMap } from '../../../../shared/security/dashboard-map.types';

export const QIYAS_DASHBOARD_MAP: ModuleDashboardMap = {
  moduleCode: 'qiyas',
  dashboardPresets: ['qiyas_ops'],
  widgetVisibility: {
    'qiyas.assessment_progress': { visibleToRoles: ['owner','admin','tenant_admin','qiyas_assessor','module_lead','auditor','viewer'] },
    'qiyas.maturity_scores': { visibleToRoles: ['owner','admin','tenant_admin','qiyas_assessor','module_lead','auditor','viewer'] },
    'qiyas.benchmark_comparison': { visibleToRoles: ['owner','admin','tenant_admin','qiyas_assessor','module_lead','auditor','viewer'] },
  },
};
