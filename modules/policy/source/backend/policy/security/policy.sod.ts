export interface POLICYSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const POLICY_SOD_RULES: POLICYSodRule[] = [
  {
    ruleCode: 'pol-sod-001',
    severity: 'critical',
    conflictingRoles: ['policy.contributor', 'policy.approver'],
    conflictingActions: ['policy.record.write', 'policy.record.approve'],
    descriptionEn: 'A user cannot both create and approve policy records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات policy في نفس الوقت',
  },
  {
    ruleCode: 'pol-sod-002',
    severity: 'high',
    conflictingRoles: ['policy.contributor', 'policy.executive_owner'],
    conflictingActions: ['policy.record.write', 'policy.record.delete'],
    descriptionEn: 'A user cannot both create and delete policy records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات policy في نفس الوقت',
  },
];
