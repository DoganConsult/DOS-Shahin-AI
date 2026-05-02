interface INTEGRATIONS_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const INTEGRATIONS_SOD_RULES: INTEGRATIONS_SodRule[] = [
  {
    ruleCode: 'int-sod-001',
    severity: 'critical',
    conflictingRoles: ['integrations.contributor', 'integrations.approver'],
    conflictingActions: ['integrations.record.write', 'integrations.record.approve'],
    descriptionEn: 'A user cannot both create and approve integrations records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات integrations في نفس الوقت',
  },
  {
    ruleCode: 'int-sod-002',
    severity: 'high',
    conflictingRoles: ['integrations.contributor', 'integrations.executive_owner'],
    conflictingActions: ['integrations.record.write', 'integrations.record.delete'],
    descriptionEn: 'A user cannot both create and delete integrations records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات integrations في نفس الوقت',
  },
];
