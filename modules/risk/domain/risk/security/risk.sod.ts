export interface RISKSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const RISK_SOD_RULES: RISKSodRule[] = [
  {
    ruleCode: 'rsk-sod-001',
    severity: 'critical',
    conflictingRoles: ['risk.contributor', 'risk.approver'],
    conflictingActions: ['risk.record.write', 'risk.record.approve'],
    descriptionEn: 'A user cannot both create and approve risk records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات risk في نفس الوقت',
  },
  {
    ruleCode: 'rsk-sod-002',
    severity: 'high',
    conflictingRoles: ['risk.contributor', 'risk.executive_owner'],
    conflictingActions: ['risk.record.write', 'risk.record.delete'],
    descriptionEn: 'A user cannot both create and delete risk records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات risk في نفس الوقت',
  },
];
