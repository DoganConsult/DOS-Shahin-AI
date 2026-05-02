interface WORKFLOW_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const WORKFLOW_SOD_RULES: WORKFLOW_SodRule[] = [
  {
    ruleCode: 'wfl-sod-001',
    severity: 'critical',
    conflictingRoles: ['workflow.operator', 'workflow.viewer'],
    conflictingActions: ['workflow.record.write', 'workflow.record.approve'],
    descriptionEn: 'A user cannot both write and approve workflow records',
    descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات workflow في نفس الوقت',
  },
  {
    ruleCode: 'wfl-sod-002',
    severity: 'high',
    conflictingRoles: ['workflow.operator'],
    conflictingActions: ['workflow.record.write', 'workflow.record.delete'],
    descriptionEn: 'A user cannot both write and delete workflow records',
    descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات workflow في نفس الوقت',
  },
];
