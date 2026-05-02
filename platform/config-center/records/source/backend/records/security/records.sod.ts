interface RECORDS_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const RECORDS_SOD_RULES: RECORDS_SodRule[] = [
  {
    ruleCode: 'rec-sod-001',
    severity: 'critical',
    conflictingRoles: ['records.contributor', 'records.approver'],
    conflictingActions: ['records.record.write', 'records.record.approve'],
    descriptionEn: 'A user cannot both create and approve records records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات records في نفس الوقت',
  },
  {
    ruleCode: 'rec-sod-002',
    severity: 'high',
    conflictingRoles: ['records.contributor', 'records.executive_owner'],
    conflictingActions: ['records.record.write', 'records.record.delete'],
    descriptionEn: 'A user cannot both create and delete records records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات records في نفس الوقت',
  },
];
