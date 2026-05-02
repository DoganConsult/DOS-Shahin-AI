interface INBOX_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const INBOX_SOD_RULES: INBOX_SodRule[] = [
  {
    ruleCode: 'ibx-sod-001',
    severity: 'critical',
    conflictingRoles: ['inbox.operator', 'inbox.viewer'],
    conflictingActions: ['inbox.record.write', 'inbox.record.approve'],
    descriptionEn: 'A user cannot both write and approve inbox records',
    descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات inbox في نفس الوقت',
  },
  {
    ruleCode: 'ibx-sod-002',
    severity: 'high',
    conflictingRoles: ['inbox.operator'],
    conflictingActions: ['inbox.record.write', 'inbox.record.delete'],
    descriptionEn: 'A user cannot both write and delete inbox records',
    descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات inbox في نفس الوقت',
  },
];
