export interface ISSUESSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const ISSUES_SOD_RULES: ISSUESSodRule[] = [
  {
    ruleCode: 'iss-sod-001',
    severity: 'critical',
    conflictingRoles: ['issues.contributor', 'issues.approver'],
    conflictingActions: ['issues.record.write', 'issues.record.approve'],
    descriptionEn: 'A user cannot both create and approve issues records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات issues في نفس الوقت',
  },
  {
    ruleCode: 'iss-sod-002',
    severity: 'high',
    conflictingRoles: ['issues.contributor', 'issues.executive_owner'],
    conflictingActions: ['issues.record.write', 'issues.record.delete'],
    descriptionEn: 'A user cannot both create and delete issues records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات issues في نفس الوقت',
  },
];
