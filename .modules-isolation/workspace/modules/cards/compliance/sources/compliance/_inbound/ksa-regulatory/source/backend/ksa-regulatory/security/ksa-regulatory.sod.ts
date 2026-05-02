interface KSA_REGULATORY_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const KSA_REGULATORY_SOD_RULES: KSA_REGULATORY_SodRule[] = [
  {
    ruleCode: 'ksa-sod-001',
    severity: 'critical',
    conflictingRoles: ['ksa-regulatory.contributor', 'ksa-regulatory.approver'],
    conflictingActions: ['ksa-regulatory.record.write', 'ksa-regulatory.record.approve'],
    descriptionEn: 'A user cannot both create and approve ksa-regulatory records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات ksa-regulatory في نفس الوقت',
  },
  {
    ruleCode: 'ksa-sod-002',
    severity: 'high',
    conflictingRoles: ['ksa-regulatory.contributor', 'ksa-regulatory.executive_owner'],
    conflictingActions: ['ksa-regulatory.record.write', 'ksa-regulatory.record.delete'],
    descriptionEn: 'A user cannot both create and delete ksa-regulatory records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات ksa-regulatory في نفس الوقت',
  },
];
