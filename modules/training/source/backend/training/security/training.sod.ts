interface TRAINING_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const TRAINING_SOD_RULES: TRAINING_SodRule[] = [
  {
    ruleCode: 'trn-sod-001',
    severity: 'critical',
    conflictingRoles: ['training.contributor', 'training.approver'],
    conflictingActions: ['training.record.write', 'training.record.approve'],
    descriptionEn: 'A user cannot both create and approve training records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات training في نفس الوقت',
  },
  {
    ruleCode: 'trn-sod-002',
    severity: 'high',
    conflictingRoles: ['training.contributor', 'training.executive_owner'],
    conflictingActions: ['training.record.write', 'training.record.delete'],
    descriptionEn: 'A user cannot both create and delete training records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات training في نفس الوقت',
  },
];
