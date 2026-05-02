export interface EXCEPTIONSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const EXCEPTION_SOD_RULES: EXCEPTIONSodRule[] = [
  {
    ruleCode: 'exc-sod-001',
    severity: 'critical',
    conflictingRoles: ['exception.contributor', 'exception.approver'],
    conflictingActions: ['exception.record.write', 'exception.record.approve'],
    descriptionEn: 'A user cannot both create and approve exception records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات exception في نفس الوقت',
  },
  {
    ruleCode: 'exc-sod-002',
    severity: 'high',
    conflictingRoles: ['exception.contributor', 'exception.executive_owner'],
    conflictingActions: ['exception.record.write', 'exception.record.delete'],
    descriptionEn: 'A user cannot both create and delete exception records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات exception في نفس الوقت',
  },
];
