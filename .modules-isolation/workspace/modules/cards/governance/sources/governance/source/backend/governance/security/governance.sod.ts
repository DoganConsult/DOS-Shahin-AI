export interface GOVERNANCESodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const GOVERNANCE_SOD_RULES: GOVERNANCESodRule[] = [
  {
    ruleCode: 'gov-sod-001',
    severity: 'critical',
    conflictingRoles: ['governance.contributor', 'governance.approver'],
    conflictingActions: ['governance.record.write', 'governance.record.approve'],
    descriptionEn: 'A user cannot both create and approve governance records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات governance في نفس الوقت',
  },
  {
    ruleCode: 'gov-sod-002',
    severity: 'high',
    conflictingRoles: ['governance.contributor', 'governance.executive_owner'],
    conflictingActions: ['governance.record.write', 'governance.record.delete'],
    descriptionEn: 'A user cannot both create and delete governance records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات governance في نفس الوقت',
  },
];
