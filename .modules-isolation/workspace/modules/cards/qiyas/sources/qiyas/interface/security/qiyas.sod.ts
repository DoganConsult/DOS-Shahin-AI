interface QIYAS_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const QIYAS_SOD_RULES: QIYAS_SodRule[] = [
  {
    ruleCode: 'qiy-sod-001',
    severity: 'critical',
    conflictingRoles: ['qiyas.contributor', 'qiyas.approver'],
    conflictingActions: ['qiyas.record.write', 'qiyas.record.approve'],
    descriptionEn: 'A user cannot both create and approve qiyas records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات qiyas في نفس الوقت',
  },
  {
    ruleCode: 'qiy-sod-002',
    severity: 'high',
    conflictingRoles: ['qiyas.contributor', 'qiyas.executive_owner'],
    conflictingActions: ['qiyas.record.write', 'qiyas.record.delete'],
    descriptionEn: 'A user cannot both create and delete qiyas records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات qiyas في نفس الوقت',
  },
];
