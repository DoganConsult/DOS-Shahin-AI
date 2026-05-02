export interface EVIDENCESodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const EVIDENCE_SOD_RULES: EVIDENCESodRule[] = [
  {
    ruleCode: 'evd-sod-001',
    severity: 'critical',
    conflictingRoles: ['evidence.contributor', 'evidence.approver'],
    conflictingActions: ['evidence.record.write', 'evidence.record.approve'],
    descriptionEn: 'A user cannot both create and approve evidence records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات evidence في نفس الوقت',
  },
  {
    ruleCode: 'evd-sod-002',
    severity: 'high',
    conflictingRoles: ['evidence.contributor', 'evidence.executive_owner'],
    conflictingActions: ['evidence.record.write', 'evidence.record.delete'],
    descriptionEn: 'A user cannot both create and delete evidence records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات evidence في نفس الوقت',
  },
];
