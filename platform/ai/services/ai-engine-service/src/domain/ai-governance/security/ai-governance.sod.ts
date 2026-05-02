interface AI_GOVERNANCE_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const AI_GOVERNANCE_SOD_RULES: AI_GOVERNANCE_SodRule[] = [
  {
    ruleCode: 'aig-sod-001',
    severity: 'critical',
    conflictingRoles: ['ai-governance.contributor', 'ai-governance.approver'],
    conflictingActions: ['ai-governance.record.write', 'ai-governance.record.approve'],
    descriptionEn: 'A user cannot both create and approve ai-governance records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات ai-governance في نفس الوقت',
  },
  {
    ruleCode: 'aig-sod-002',
    severity: 'high',
    conflictingRoles: ['ai-governance.contributor', 'ai-governance.executive_owner'],
    conflictingActions: ['ai-governance.record.write', 'ai-governance.record.delete'],
    descriptionEn: 'A user cannot both create and delete ai-governance records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات ai-governance في نفس الوقت',
  },
];
