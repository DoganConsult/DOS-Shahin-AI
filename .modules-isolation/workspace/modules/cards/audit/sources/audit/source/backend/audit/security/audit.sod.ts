export interface AUDITSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const AUDIT_SOD_RULES: AUDITSodRule[] = [
  {
    ruleCode: 'aud-sod-001',
    severity: 'critical',
    conflictingRoles: ['audit.contributor', 'audit.approver'],
    conflictingActions: ['audit.record.write', 'audit.record.approve'],
    descriptionEn: 'A user cannot both create and approve audit records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات audit في نفس الوقت',
  },
  {
    ruleCode: 'aud-sod-002',
    severity: 'high',
    conflictingRoles: ['audit.contributor', 'audit.executive_owner'],
    conflictingActions: ['audit.record.write', 'audit.record.delete'],
    descriptionEn: 'A user cannot both create and delete audit records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات audit في نفس الوقت',
  },
];
