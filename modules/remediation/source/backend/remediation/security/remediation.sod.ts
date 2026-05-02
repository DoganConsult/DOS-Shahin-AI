export interface REMEDIATIONSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const REMEDIATION_SOD_RULES: REMEDIATIONSodRule[] = [
  {
    ruleCode: 'rem-sod-001',
    severity: 'critical',
    conflictingRoles: ['remediation.contributor', 'remediation.approver'],
    conflictingActions: ['remediation.record.write', 'remediation.record.approve'],
    descriptionEn: 'A user cannot both create and approve remediation records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات remediation في نفس الوقت',
  },
  {
    ruleCode: 'rem-sod-002',
    severity: 'high',
    conflictingRoles: ['remediation.contributor', 'remediation.executive_owner'],
    conflictingActions: ['remediation.record.write', 'remediation.record.delete'],
    descriptionEn: 'A user cannot both create and delete remediation records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات remediation في نفس الوقت',
  },
];
